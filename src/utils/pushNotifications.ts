/**
 * Push Notification Manager
 * Handles browser push notifications for farming alerts
 */

import { supabase } from "@/integrations/supabase/client";

export type NotificationCategory = "moisture" | "schedule" | "alerts" | "irrigation" | "pest";

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  category: NotificationCategory;
}

// Check if notifications are supported and permitted
export function canNotify(): boolean {
  return "Notification" in window && Notification.permission === "granted";
}

// Request notification permission
export async function requestPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

// Send a local push notification
export function sendNotification({ title, body, icon, tag, category }: NotificationOptions): void {
  if (!canNotify()) return;

  // Check user preferences before sending
  const prefsStr = localStorage.getItem("agroeye_notification_prefs");
  if (prefsStr) {
    const prefs = JSON.parse(prefsStr);
    if (!prefs.enabled) return;
    if (category === "moisture" && !prefs.moisture) return;
    if (category === "schedule" && !prefs.schedule) return;
    if (category === "alerts" && !prefs.alerts) return;
    if (category === "irrigation" && !prefs.irrigation) return;
    if (category === "pest" && !prefs.pest) return;
  }

  const notifOptions: any = {
    body,
    icon: icon || "/icon-192.png",
    tag: tag || `agroeye-${category}-${Date.now()}`,
    badge: "/icon-192.png",
    vibrate: [200, 100, 200],
    requireInteraction: category === "moisture" || category === "alerts",
  };

  const notification = new Notification(title, notifOptions);

  notification.onclick = () => {
    window.focus();
    notification.close();
  };
}

// Save notification preferences to localStorage (for offline access)
export function saveNotificationPrefs(prefs: {
  enabled: boolean;
  moisture: boolean;
  schedule: boolean;
  alerts: boolean;
  irrigation: boolean;
  pest: boolean;
}): void {
  localStorage.setItem("agroeye_notification_prefs", JSON.stringify(prefs));
}

// Check moisture and send alerts if needed
export async function checkMoistureAlerts(userId: string): Promise<void> {
  const { data } = await supabase
    .from("moisture_readings")
    .select("moisture_level")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (data && data.moisture_level < 30) {
    sendNotification({
      title: "⚠️ Low Soil Moisture",
      body: `Moisture is at ${data.moisture_level}%. Your crops need water soon!`,
      category: "moisture",
      tag: "moisture-low",
    });
  }
}

// Check upcoming schedules and notify
export async function checkScheduleReminders(userId: string): Promise<void> {
  const { data } = await supabase
    .from("watering_schedules")
    .select("title, time_of_day")
    .eq("user_id", userId)
    .eq("is_enabled", true);

  if (!data || data.length === 0) return;

  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

  for (const schedule of data) {
    // Check if schedule is within next 15 minutes
    const [schedH, schedM] = schedule.time_of_day.split(":").map(Number);
    const [nowH, nowM] = currentTime.split(":").map(Number);
    const schedMin = schedH * 60 + schedM;
    const nowMin = nowH * 60 + nowM;
    const diff = schedMin - nowMin;

    if (diff > 0 && diff <= 15) {
      sendNotification({
        title: "🌊 Watering Reminder",
        body: `"${schedule.title}" is scheduled in ${diff} minutes`,
        category: "schedule",
        tag: `schedule-${schedule.title}`,
      });
    }
  }
}

// Start periodic notification checks (every 5 minutes)
let intervalId: number | null = null;

export function startNotificationMonitor(userId: string): void {
  if (intervalId) return;

  // Initial check
  checkMoistureAlerts(userId);
  checkScheduleReminders(userId);

  // Periodic checks
  intervalId = window.setInterval(() => {
    checkMoistureAlerts(userId);
    checkScheduleReminders(userId);
  }, 5 * 60 * 1000);
}

export function stopNotificationMonitor(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
