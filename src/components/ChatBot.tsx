import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Sparkles, Mic, MicOff, Volume2, VolumeX, QrCode, Trash2 } from "lucide-react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { getBackendMode } from "@/utils/backendAdapter";
import { getLocalChatResponse } from "@/utils/localAI";
import { detectDevice, getDeviceDescription, getSetupRecommendation, suggestSensorType, suggestPumpType } from "@/utils/deviceDetection";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { hapticFeedback } from "@/utils/haptics";

interface Message {
  role: "user" | "assistant";
  content: string;
  deviceAction?: {
    type: "sensor" | "pump";
    code: string;
    name: string;
    sensorType?: string;
    pumpType?: string;
  };
}

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const scannerRef = useRef<any>(null);
  const { toast } = useToast();

  // Load chat history from database
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setHistoryLoaded(true); return; }
        const { data } = await supabase
          .from("chat_messages" as any)
          .select("role, content")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true })
          .limit(50);
        if (data && data.length > 0) {
          setMessages(data.map((m: any) => ({ role: m.role, content: m.content })));
        }
      } catch (e) {
        console.warn("Could not load chat history:", e);
      }
      setHistoryLoaded(true);
    };
    loadHistory();
  }, []);

  // Save messages to database when they change
  const saveMessage = async (role: "user" | "assistant", content: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("chat_messages" as any).insert({
        user_id: user.id,
        role,
        content,
      });
    } catch (e) {
      console.warn("Could not save chat message:", e);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Cleanup speech and scanner on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      window.speechSynthesis?.cancel();
      scannerRef.current?.stop().catch(() => {});
    };
  }, []);

  const speakText = useCallback((text: string) => {
    if (!voiceEnabled || !window.speechSynthesis) return;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    // Clean text for speech (remove emojis and markdown)
    const cleanText = text
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
      .replace(/[*_~`#]/g, "")
      .trim();
    
    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    // Try to pick a good voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.name.includes("Google") && v.lang.startsWith("en")) 
      || voices.find(v => v.lang.startsWith("en") && v.localService)
      || voices[0];
    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [voiceEnabled]);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  const toggleListening = useCallback(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognitionAPI) {
      toast({ title: "Not supported", description: "Speech recognition isn't available in this browser.", variant: "destructive" });
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInput(transcript);
      
      // Auto-send on final result
      if (event.results[event.results.length - 1].isFinal) {
        setIsListening(false);
        if (transcript.trim()) {
          // Small delay to show the transcribed text before sending
          setTimeout(() => {
            setInput("");
            streamChat(transcript.trim());
          }, 300);
        }
      }
    };

    recognition.onerror = (event: Event) => {
      console.error("Speech recognition error:", event);
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  }, [isListening, toast]);

  // QR Code scanning for device pairing
  const startQRScanning = useCallback(async () => {
    setIsScanning(true);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("chat-qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 200, height: 200 } },
        async (decodedText) => {
          scanner.stop().catch(() => {});
          setIsScanning(false);

          // Use AI device detection
          const detected = detectDevice(decodedText);

          if (detected) {
            const description = getDeviceDescription(detected);
            const recommendation = getSetupRecommendation(detected);

            const deviceMsg: Message = {
              role: "assistant",
              content: `🔍 **Device Detected!**\n\n**${detected.name}**\nCode: \`${detected.code}\`\n${detected.manufacturer ? `Manufacturer: ${detected.manufacturer}\n` : ""}${detected.model ? `Model: ${detected.model}\n` : ""}${detected.specs?.type ? `Type: ${detected.specs.type}\n` : ""}${detected.specs?.protocol ? `Protocol: ${detected.specs.protocol}\n` : ""}\n📋 **Setup Tip:** ${recommendation}\n\nWould you like me to pair this ${detected.deviceType}?`,
              deviceAction: {
                type: detected.deviceType === "pump" ? "pump" : "sensor",
                code: detected.code,
                name: detected.name || detected.code,
                sensorType: detected.deviceType === "sensor" ? suggestSensorType(detected) : undefined,
                pumpType: detected.deviceType === "pump" ? suggestPumpType(detected) : undefined,
              },
            };

            setMessages(prev => [...prev, deviceMsg]);
            speakText(`Device detected! ${description}. Would you like me to pair this ${detected.deviceType}?`);
          } else {
            setMessages(prev => [...prev, {
              role: "assistant",
              content: `⚠️ I couldn't identify the device from this QR code.\n\nScanned data: \`${decodedText.slice(0, 100)}\`\n\nTry scanning a sensor or pump QR code, or add the device manually from the Sensors page.`,
            }]);
            speakText("I couldn't identify this device. Try scanning a sensor or pump QR code.");
          }
        },
        () => {}
      );
    } catch (err) {
      console.error("QR scanner error:", err);
      setIsScanning(false);
      toast({ title: "Camera Error", description: "Please allow camera access to scan QR codes.", variant: "destructive" });
    }
  }, [speakText, toast]);

  const stopQRScanning = useCallback(() => {
    scannerRef.current?.stop().catch(() => {});
    scannerRef.current = null;
    setIsScanning(false);
  }, []);

  // Pair a device from the chat
  const pairDevice = useCallback(async (action: NonNullable<Message["deviceAction"]>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Not logged in", description: "Please sign in to pair devices.", variant: "destructive" });
      return;
    }

    if (action.type === "sensor") {
      // Get location
      let lat: number | null = null, lng: number | null = null;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch { /* location not available */ }

      const { error } = await supabase.from("sensors").insert({
        user_id: user.id,
        sensor_code: action.code,
        sensor_name: action.name,
        sensor_type: action.sensorType || "moisture",
        is_active: true,
        latitude: lat,
        longitude: lng,
      });

      if (error) {
        setMessages(prev => [...prev, { role: "assistant", content: `❌ Failed to pair sensor: ${error.message}` }]);
        speakText("Sorry, I couldn't pair the sensor.");
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: `✅ **${action.name}** has been paired!\n\nYou can now see it in your Sensors page. Download the Arduino sketch to configure your hardware.` }]);
        speakText(`Great! ${action.name} has been paired successfully.`);
      }
    } else if (action.type === "pump") {
      // Store pump in localStorage
      const stored = localStorage.getItem(`agroeye_pumps_${user.id}`);
      const pumps = stored ? JSON.parse(stored) : [];
      
      const newPump = {
        id: crypto.randomUUID(),
        name: action.name,
        code: action.code,
        type: action.pumpType || "submersible",
        status: "online",
        lastRun: null,
        autoMode: false,
        flowRate: 15,
      };
      
      pumps.push(newPump);
      localStorage.setItem(`agroeye_pumps_${user.id}`, JSON.stringify(pumps));
      
      setMessages(prev => [...prev, { role: "assistant", content: `✅ **${action.name}** has been paired!\n\nGo to Pump Control to manage your pump and download the Arduino sketch.` }]);
      speakText(`Perfect! ${action.name} has been paired. You can control it from the Pump Control page.`);
    }
  }, [speakText, toast]);

  // Gather app context to send to the AI
  const gatherAppContext = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const lang = localStorage.getItem("i18nextLng") || navigator.language || "en";
    
    // Get pumps from localStorage
    let pumps: any[] = [];
    if (user) {
      try {
        const stored = localStorage.getItem(`agroeye_pumps_${user.id}`);
        if (stored) pumps = JSON.parse(stored);
      } catch {}
    }

    // Fetch live weather data from open-meteo
    let liveWeather: any = null;
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
      );
      const weatherResp = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code&timezone=auto`
      );
      if (weatherResp.ok) {
        const weatherJson = await weatherResp.json();
        const current = weatherJson.current;
        // Reverse geocode for location name
        let locationName = `${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)}`;
        try {
          const geoResp = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&zoom=14`);
          if (geoResp.ok) {
            const geoData = await geoResp.json();
            locationName = geoData.address?.city || geoData.address?.suburb || geoData.display_name?.split(",")[0] || locationName;
          }
        } catch {}
        liveWeather = {
          temperature: current?.temperature_2m,
          humidity: current?.relative_humidity_2m,
          precipitation: current?.precipitation,
          wind_speed: current?.wind_speed_10m,
          weather_code: current?.weather_code,
          location: locationName,
        };
      }
    } catch {}

    return {
      language: lang,
      pumps,
      liveWeather,
      userAgent: navigator.userAgent,
      screenSize: `${window.innerWidth}x${window.innerHeight}`,
      isOnline: navigator.onLine,
      currentPage: window.location.pathname,
    };
  }, []);

  const streamChat = async (userMessage: string) => {
    const newMessages: Message[] = [...messages, { role: "user" as const, content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);
    saveMessage("user", userMessage);

    // Check if user wants to pair a device mentioned in previous messages
    const lowerMsg = userMessage.toLowerCase();
    if ((lowerMsg.includes("yes") || lowerMsg.includes("pair") || lowerMsg.includes("connect") || lowerMsg.includes("add")) && messages.length > 0) {
      const lastWithAction = [...messages].reverse().find(m => m.deviceAction);
      if (lastWithAction?.deviceAction) {
        await pairDevice(lastWithAction.deviceAction);
        setIsLoading(false);
        return;
      }
    }

    // Check if user is providing a device code directly
    const deviceMatch = detectDevice(userMessage);
    if (deviceMatch && deviceMatch.confidence !== "low") {
      const description = getDeviceDescription(deviceMatch);
      const recommendation = getSetupRecommendation(deviceMatch);
      
      const response: Message = {
        role: "assistant",
        content: `🔍 I detected a device in your message!\n\n**${deviceMatch.name}**\n${deviceMatch.manufacturer ? `Manufacturer: ${deviceMatch.manufacturer}\n` : ""}${deviceMatch.model ? `Model: ${deviceMatch.model}\n` : ""}${deviceMatch.specs?.type ? `Type: ${deviceMatch.specs.type}\n` : ""}\n📋 ${recommendation}\n\nSay "pair it" or tap the button below to connect it!`,
        deviceAction: {
          type: deviceMatch.deviceType === "pump" ? "pump" : "sensor",
          code: deviceMatch.code,
          name: deviceMatch.name || deviceMatch.code,
          sensorType: deviceMatch.deviceType === "sensor" ? suggestSensorType(deviceMatch) : undefined,
          pumpType: deviceMatch.deviceType === "pump" ? suggestPumpType(deviceMatch) : undefined,
        },
      };
      
      setMessages([...newMessages, response]);
      speakText(`I detected ${description}. Say pair it to connect!`);
      setIsLoading(false);
      return;
    }

    try {
      const mode = getBackendMode();

      if (mode === "local" || !import.meta.env.VITE_SUPABASE_URL) {
        const response = getLocalChatResponse(userMessage);
        setMessages([...newMessages, { role: "assistant", content: response }]);
        speakText(response);
        setIsLoading(false);
        return;
      }

      const appContext = await gatherAppContext();
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-assistant`;
      
      // Get the user's JWT token for authenticated context
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ messages: newMessages, appContext }),
      });

      if (!resp.ok) {
        if (resp.status === 429 || resp.status === 402) {
          const error = await resp.json();
          toast({ title: "Service Unavailable", description: error.error || "Please try again later.", variant: "destructive" });
          setMessages(messages);
          return;
        }
        const response = getLocalChatResponse(userMessage);
        setMessages([...newMessages, { role: "assistant", content: response }]);
        speakText(response);
        return;
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let assistantContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages([...newMessages, { role: "assistant", content: assistantContent }]);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Speak and save the complete response
      if (assistantContent) {
        speakText(assistantContent);
        saveMessage("assistant", assistantContent);
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast({ title: "Error", description: "Failed to get response. Please try again.", variant: "destructive" });
      setMessages(messages);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage = input.trim();
    setInput("");
    await streamChat(userMessage);
  };

  const hasSpeechRecognition = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

  const bubbleOffset = "calc(1rem + 58px + 0.75rem + env(safe-area-inset-bottom, 0px))";

  const chatContent = (
    <>
      <AnimatePresence mode="wait">
        {!isOpen && (
          <motion.div
            key="bubble"
            className="fixed z-50 right-4"
            style={{ bottom: bubbleOffset }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: "spring", damping: 14, stiffness: 260, delay: 0.6 }}
          >
            <Button
              onClick={() => { hapticFeedback("medium"); setIsOpen(true); }}
              className="h-14 w-14 rounded-full shadow-xl bg-primary hover:bg-primary/90"
              size="icon"
            >
              <Sparkles className="h-6 w-6" />
            </Button>
          </motion.div>
        )}

        {isOpen && (
          <motion.div
            key="chat-window"
            className="fixed z-50 w-80 h-[420px] flex flex-col shadow-2xl rounded-2xl overflow-hidden glass-card right-4"
            style={{
              bottom: bubbleOffset,
              transformOrigin: "calc(100% - 1.75rem) 100%",
              perspective: "800px",
            }}
            initial={{
              scaleX: 0.08,
              scaleY: 0.04,
              opacity: 0,
              borderRadius: "50%",
              filter: "blur(4px)",
            }}
            animate={{
              scaleX: 1,
              scaleY: 1,
              opacity: 1,
              borderRadius: "1rem",
              filter: "blur(0px)",
              transition: {
                scaleX: { type: "spring", damping: 20, stiffness: 220, mass: 0.8 },
                scaleY: { type: "spring", damping: 18, stiffness: 200, mass: 0.8, delay: 0.04 },
                opacity: { duration: 0.15, ease: "easeOut" },
                borderRadius: { duration: 0.3, ease: "easeOut" },
                filter: { duration: 0.2, ease: "easeOut" },
              },
            }}
            exit={{
              scaleX: 0.08,
              scaleY: 0.04,
              opacity: 0,
              borderRadius: "50%",
              filter: "blur(4px)",
              transition: {
                scaleX: { type: "spring", damping: 28, stiffness: 350, mass: 0.6 },
                scaleY: { type: "spring", damping: 30, stiffness: 380, mass: 0.6, delay: 0.02 },
                opacity: { duration: 0.2, delay: 0.1, ease: "easeIn" },
                borderRadius: { duration: 0.15, ease: "easeIn" },
                filter: { duration: 0.15, ease: "easeIn" },
              },
            }}
          >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 glass-header text-primary-foreground">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Sprout 🌱</h3>
                <p className="text-[10px] opacity-80">
                  {isListening ? "Listening..." : isSpeaking ? "Speaking..." : "Your farming buddy"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={async () => {
                    hapticFeedback("light");
                    setMessages([]);
                    try {
                      const { data: { user } } = await supabase.auth.getUser();
                      if (user) {
                        await supabase.from("chat_messages" as any).delete().eq("user_id", user.id);
                      }
                    } catch {}
                  }}
                  className="h-7 w-7 hover:bg-primary-foreground/10 text-primary-foreground"
                  title="Clear chat history"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (isSpeaking) stopSpeaking();
                  setVoiceEnabled(!voiceEnabled);
                }}
                className="h-7 w-7 hover:bg-primary-foreground/10 text-primary-foreground"
                title={voiceEnabled ? "Mute voice" : "Enable voice"}
              >
                {voiceEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { hapticFeedback("light"); setIsOpen(false); stopSpeaking(); }}
                className="h-7 w-7 hover:bg-primary-foreground/10 text-primary-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-3" ref={scrollRef}>
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground text-xs py-6 px-2">
                <div className="text-3xl mb-2">🌱</div>
                <p className="font-medium text-sm text-foreground mb-1">Hey! I'm Sprout</p>
                <p>Ask me about soil health, watering tips, pest control, or anything farming!</p>
                <p className="mt-2 text-primary text-[10px]">📷 Scan a QR code to pair sensors & pumps!</p>
                {hasSpeechRecognition && (
                  <p className="mt-1 text-primary text-[10px]">🎙️ Tap the mic to talk to me!</p>
                )}
              </div>
            )}
            {messages.map((msg, idx) => (
              <div key={idx} className={`mb-2.5 ${msg.role === "user" ? "text-right" : "text-left"}`}>
                <div
                  className={cn(
                    "inline-block max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  )}
                >
                  <span className="whitespace-pre-wrap">{msg.content}</span>
                </div>
                {/* Pair device button */}
                {msg.role === "assistant" && msg.deviceAction && (
                  <div className="mt-1">
                    <Button
                      size="sm"
                      className="rounded-full text-xs h-7 px-3"
                      onClick={() => pairDevice(msg.deviceAction!)}
                    >
                      ✅ Pair {msg.deviceAction.type === "pump" ? "Pump" : "Sensor"}
                    </Button>
                  </div>
                )}
                {/* Replay button for assistant messages */}
                {msg.role === "assistant" && voiceEnabled && !msg.deviceAction && (
                  <button
                    onClick={() => speakText(msg.content)}
                    className="inline-flex items-center ml-1 text-muted-foreground hover:text-primary transition-colors"
                    title="Listen again"
                  >
                    <Volume2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="text-left mb-2">
                <div className="inline-block bg-muted rounded-2xl rounded-bl-sm px-3 py-2 text-sm">
                  <span className="animate-pulse">Sprout is thinking...</span>
                </div>
              </div>
            )}
          </ScrollArea>

          {/* QR Scanner Area */}
          {isScanning && (
            <div className="px-3 pb-2">
              <div className="rounded-xl overflow-hidden bg-black relative">
                <div id="chat-qr-reader" className="w-full" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full rounded-none text-xs text-muted-foreground"
                  onClick={stopQRScanning}
                >
                  Cancel Scan
                </Button>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-border/50 flex gap-2">
            <Button
              onClick={isScanning ? stopQRScanning : startQRScanning}
              size="icon"
              variant={isScanning ? "destructive" : "outline"}
              className="rounded-full h-9 w-9 shrink-0"
              title="Scan device QR code"
            >
              <QrCode className="h-4 w-4" />
            </Button>
            {hasSpeechRecognition && (
              <Button
                onClick={toggleListening}
                size="icon"
                variant={isListening ? "destructive" : "outline"}
                className={cn(
                  "rounded-full h-9 w-9 shrink-0 transition-all",
                  isListening && "animate-pulse"
                )}
                title={isListening ? "Stop listening" : "Start voice input"}
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            )}
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
              placeholder={isListening ? "Listening..." : "Ask Sprout..."}
              disabled={isLoading}
              className="flex-1 rounded-full text-sm h-9 bg-muted/50"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="rounded-full h-9 w-9"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  if (typeof document === "undefined") return null;

  return createPortal(chatContent, document.body);
};

export default ChatBot;

// Type declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}
