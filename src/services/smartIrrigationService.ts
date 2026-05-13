/**
 * Smart Irrigation Automation Service
 * 
 * Connects moisture sensors → irrigation engine → pump control
 * When auto mode is enabled, monitors moisture in real-time and
 * automatically triggers pumps when soil is too dry, stops when optimal.
 */

import { supabase } from "@/integrations/supabase/client";
import { calculateIrrigationDuration } from "@/engine/irrigationEngine";
import { hapticFeedback } from "@/utils/haptics";
import { sendNotification } from "@/utils/pushNotifications";

export interface AutoIrrigationConfig {
  /** Moisture % below which pump turns ON */
  dryThreshold: number;
  /** Moisture % at which pump turns OFF */
  wetThreshold: number;
  /** Max run time in minutes before forced stop */
  maxRunMinutes: number;
  /** Cooldown between runs in minutes */
  cooldownMinutes: number;
  /** Check interval in seconds */
  checkIntervalSeconds: number;
}

const DEFAULT_CONFIG: AutoIrrigationConfig = {
  dryThreshold: 30,
  wetThreshold: 55,
  maxRunMinutes: 30,
  cooldownMinutes: 15,
  checkIntervalSeconds: 30,
};

export interface PumpState {
  pumpId: string;
  pumpName: string;
  isRunning: boolean;
  startedAt: string | null;
  moistureAtStart: number | null;
  autoMode: boolean;
}

type AutoIrrigationListener = (event: {
  type: "pump_started" | "pump_stopped" | "moisture_check" | "config_changed";
  pumpId?: string;
  moisture?: number;
  reason?: string;
}) => void;

class SmartIrrigationService {
  private config: AutoIrrigationConfig = { ...DEFAULT_CONFIG };
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private pumpStates: Map<string, PumpState> = new Map();
  private lastRunEnd: Map<string, number> = new Map();
  private listeners: Set<AutoIrrigationListener> = new Set();
  private userId: string | null = null;

  configure(partial: Partial<AutoIrrigationConfig>) {
    this.config = { ...this.config, ...partial };
    this.emit({ type: "config_changed" });
  }

  getConfig(): AutoIrrigationConfig {
    return { ...this.config };
  }

  subscribe(listener: AutoIrrigationListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: Parameters<AutoIrrigationListener>[0]) {
    this.listeners.forEach((l) => l(event));
  }

  async start(userId: string) {
    this.userId = userId;
    this.loadPumps(userId);

    // Start periodic moisture check
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = setInterval(
      () => this.checkAndAct(),
      this.config.checkIntervalSeconds * 1000
    );

    // Also subscribe to realtime moisture changes
    supabase
      .channel("auto-irrigation-moisture")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "moisture_readings" },
        (payload) => {
          const reading = payload.new as any;
          if (reading.user_id === this.userId) {
            this.handleMoistureReading(reading.moisture_level);
          }
        }
      )
      .subscribe();
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    supabase.removeChannel(
      supabase.channel("auto-irrigation-moisture")
    );
    // Stop all running pumps
    this.pumpStates.forEach((state) => {
      if (state.isRunning) {
        this.stopPump(state.pumpId, "Service stopped");
      }
    });
  }

  registerPump(pumpId: string, pumpName: string, autoMode: boolean) {
    this.pumpStates.set(pumpId, {
      pumpId,
      pumpName,
      isRunning: false,
      startedAt: null,
      moistureAtStart: null,
      autoMode,
    });
  }

  unregisterPump(pumpId: string) {
    const state = this.pumpStates.get(pumpId);
    if (state?.isRunning) this.stopPump(pumpId, "Pump removed");
    this.pumpStates.delete(pumpId);
  }

  setPumpAutoMode(pumpId: string, autoMode: boolean) {
    const state = this.pumpStates.get(pumpId);
    if (state) {
      state.autoMode = autoMode;
      if (!autoMode && state.isRunning) {
        this.stopPump(pumpId, "Auto mode disabled");
      }
    }
  }

  getPumpState(pumpId: string): PumpState | undefined {
    return this.pumpStates.get(pumpId);
  }

  getAllPumpStates(): PumpState[] {
    return Array.from(this.pumpStates.values());
  }

  private loadPumps(userId: string) {
    try {
      const stored = localStorage.getItem(`agroeye_pumps_${userId}`);
      if (stored) {
        const pumps = JSON.parse(stored);
        pumps.forEach((p: any) => {
          this.registerPump(p.id, p.name, p.autoMode ?? false);
        });
      }
    } catch {}
  }

  private async getCurrentMoisture(): Promise<number | null> {
    if (!this.userId) return null;
    const { data } = await supabase
      .from("moisture_readings")
      .select("moisture_level")
      .eq("user_id", this.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    return data?.moisture_level ?? null;
  }

  private async checkAndAct() {
    const moisture = await this.getCurrentMoisture();
    if (moisture === null) return;

    this.emit({ type: "moisture_check", moisture });
    this.handleMoistureReading(moisture);
  }

  private handleMoistureReading(moisture: number) {
    this.pumpStates.forEach((state) => {
      if (!state.autoMode) return;

      const now = Date.now();
      const lastEnd = this.lastRunEnd.get(state.pumpId) ?? 0;
      const cooldownMs = this.config.cooldownMinutes * 60 * 1000;

      if (state.isRunning) {
        // Check if we should stop
        const runTimeMs = state.startedAt
          ? now - new Date(state.startedAt).getTime()
          : 0;
        const maxRunMs = this.config.maxRunMinutes * 60 * 1000;

        if (moisture >= this.config.wetThreshold) {
          this.stopPump(state.pumpId, `Moisture reached ${moisture}% (target: ${this.config.wetThreshold}%)`);
        } else if (runTimeMs >= maxRunMs) {
          this.stopPump(state.pumpId, `Max run time (${this.config.maxRunMinutes}min) exceeded`);
        }
      } else {
        // Check if we should start
        if (moisture < this.config.dryThreshold && now - lastEnd >= cooldownMs) {
          this.startPump(state.pumpId, moisture);
        }
      }
    });
  }

  private async startPump(pumpId: string, moisture: number) {
    const state = this.pumpStates.get(pumpId);
    if (!state || state.isRunning) return;

    state.isRunning = true;
    state.startedAt = new Date().toISOString();
    state.moistureAtStart = moisture;

    const rec = calculateIrrigationDuration(moisture, this.config.wetThreshold);

    // Log irrigation event
    if (this.userId) {
      await supabase.from("irrigation_events").insert({
        user_id: this.userId,
        trigger_type: "auto",
        duration_minutes: rec.durationMinutes,
        moisture_before: moisture,
        status: "running",
      } as any);
    }

    // Update localStorage
    this.savePumpStatus(pumpId, "running");

    hapticFeedback("medium");
    sendNotification({
      title: "💧 Auto Irrigation Started",
      body: `${state.pumpName} turned ON — soil at ${moisture}% (threshold: ${this.config.dryThreshold}%)`,
      category: "irrigation",
    });

    this.emit({ type: "pump_started", pumpId, moisture, reason: "Moisture below threshold" });
  }

  private async stopPump(pumpId: string, reason: string) {
    const state = this.pumpStates.get(pumpId);
    if (!state || !state.isRunning) return;

    const moisture = await this.getCurrentMoisture();

    state.isRunning = false;
    state.startedAt = null;
    this.lastRunEnd.set(pumpId, Date.now());

    // Update localStorage
    this.savePumpStatus(pumpId, "online");

    hapticFeedback("success");
    sendNotification({
      title: "✅ Irrigation Complete",
      body: `${state.pumpName} turned OFF — ${reason}. Current moisture: ${moisture ?? "?"}%`,
      category: "irrigation",
    });

    this.emit({ type: "pump_stopped", pumpId, moisture: moisture ?? undefined, reason });
  }

  private savePumpStatus(pumpId: string, status: string) {
    if (!this.userId) return;
    try {
      const stored = localStorage.getItem(`agroeye_pumps_${this.userId}`);
      if (stored) {
        const pumps = JSON.parse(stored);
        const updated = pumps.map((p: any) =>
          p.id === pumpId ? { ...p, status, lastRun: new Date().toISOString() } : p
        );
        localStorage.setItem(`agroeye_pumps_${this.userId}`, JSON.stringify(updated));
      }
    } catch {}
  }
}

// Singleton instance
export const smartIrrigationService = new SmartIrrigationService();
