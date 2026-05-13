import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Sprout, Phone, Mail, Fingerprint, ScanFace, Eye, EyeOff, MailCheck, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import PreferencesSetup from "@/components/PreferencesSetup";
import { isBiometricAvailable, isBiometricEnabled, authenticateWithBiometric, getBiometricTypeName } from "@/utils/biometrics";
import { motion } from "framer-motion";

const handleGoogleSignIn = async () => {
  try {
    const { lovable } = await import("@/integrations/lovable/index");
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (error) throw error;
  } catch {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) toast.error(error.message || "Google sign-in failed");
  }
};

const Auth = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authMethod, setAuthMethod] = useState<"email" | "phone">("email");
  const [showPreferences, setShowPreferences] = useState(false);
  const [authenticatedUserId, setAuthenticatedUserId] = useState<string | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricScanning, setBiometricScanning] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [showVerificationPending, setShowVerificationPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const biometricName = getBiometricTypeName();
  const BiometricIcon = biometricName.includes("Face") ? ScanFace : Fingerprint;

  useEffect(() => {
    async function checkBiometrics() {
      const available = await isBiometricAvailable();
      const enabled = isBiometricEnabled();
      setBiometricAvailable(available);
      setBiometricEnabled(enabled);
    }
    checkBiometrics();
  }, []);

  const handleBiometricAuth = async () => {
    setBiometricScanning(true);
    try {
      const result = await authenticateWithBiometric();
      if (result.success) {
        toast.success("Authenticated with " + biometricName);
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const needsSetup = await checkNeedsPreferencesSetup(session.user.id);
          if (needsSetup) {
            setAuthenticatedUserId(session.user.id);
            setShowPreferences(true);
          } else {
            navigate("/");
          }
        }
      } else {
        toast.error(result.error || "Biometric authentication failed");
      }
    } catch {
      toast.error("Biometric authentication failed");
    } finally {
      setBiometricScanning(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const needsSetup = await checkNeedsPreferencesSetup(session.user.id);
        if (needsSetup) {
          setAuthenticatedUserId(session.user.id);
          setShowPreferences(true);
        } else {
          navigate("/");
        }
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session && !showPreferences) {
        const needsSetup = await checkNeedsPreferencesSetup(session.user.id);
        if (needsSetup) {
          setAuthenticatedUserId(session.user.id);
          setShowPreferences(true);
        } else {
          navigate("/");
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkNeedsPreferencesSetup = async (userId: string): Promise<boolean> => {
    const { data } = await supabase
      .from("user_preferences")
      .select("onboarding_completed")
      .eq("user_id", userId)
      .maybeSingle();
    return !data || !data.onboarding_completed;
  };

  const handlePreferencesComplete = () => {
    setShowPreferences(false);
    navigate("/");
  };

  const getPasswordStrength = (pw: string) => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  };

  const strength = getPasswordStrength(password);
  const strengthLabel = ["Very Weak", "Weak", "Fair", "Strong"][strength - 1] || "";
  const strengthColor = ["bg-destructive", "bg-orange-500", "bg-yellow-500", "bg-primary"][strength - 1] || "bg-muted";

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) { toast.error("Please enter your full name"); return; }
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${window.location.origin}/`, data: { full_name: fullName } },
    });
    if (error) {
      if (error.message.includes("rate") || error.status === 429) {
        toast.error("Too many attempts. Please try again in a few minutes.");
      } else {
        toast.error(error.message);
      }
    } else {
      setShowVerificationPending(true);
    }
    setLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) { toast.error("Please fill in all fields"); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message.includes("rate") || error.status === 429) {
        toast.error("Too many attempts. Please try again in a few minutes.");
      } else if (error.message.includes("Invalid login")) {
        toast.error("Invalid email or password. Please try again.");
      } else if (error.message.includes("Email not confirmed")) {
        toast.error("Please verify your email before signing in. Check your inbox.");
      } else {
        toast.error(error.message);
      }
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) { toast.error("Please enter your email"); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      if (error.message.includes("rate") || error.status === 429) {
        toast.error("Too many attempts. Please try again later.");
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success("Password reset link sent! Check your email.");
      setShowForgotPassword(false);
    }
    setLoading(false);
  };

  const handleSendOtp = async () => {
    if (!phone) { toast.error("Please enter your phone number"); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ phone });
    if (error) {
      if (error.message.includes("rate") || error.status === 429) {
        toast.error("Too many attempts. Please wait before trying again.");
      } else {
        toast.error(error.message);
      }
    } else {
      setOtpSent(true);
      toast.success("OTP sent to your phone!");
    }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 6) { toast.error("Please enter the 6-digit code"); return; }
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ phone, token: otp, type: "sms" });
    if (error) toast.error(error.message);
    setLoading(false);
  };

  // Show preferences setup
  if (showPreferences && authenticatedUserId) {
    return <PreferencesSetup userId={authenticatedUserId} onComplete={handlePreferencesComplete} />;
  }

  // Show email verification pending
  if (showVerificationPending) {
    return (
      <div className="min-h-screen flex items-center justify-center mesh-gradient p-4">
        <div className="w-full max-w-md text-center space-y-5 relative z-10">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-20 h-20 mx-auto rounded-[22px] bg-primary/10 flex items-center justify-center"
          >
            <MailCheck className="w-10 h-10 text-primary" />
          </motion.div>
          <h1 className="text-xl font-bold text-foreground">Verify Your Email</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We've sent a verification link to <span className="font-medium text-foreground">{email}</span>. Please check your inbox and click the link to activate your account.
          </p>
          <div className="liquid-glass p-4 text-xs text-muted-foreground space-y-2">
            <p>• Check your spam folder if you don't see the email</p>
            <p>• The link expires in 24 hours</p>
            <p>• You can sign in once your email is verified</p>
          </div>
          <Button variant="outline" className="rounded-xl" onClick={() => setShowVerificationPending(false)}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Sign In
          </Button>
        </div>
      </div>
    );
  }

  // Show forgot password
  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center mesh-gradient p-4">
        <div className="w-full max-w-md relative z-10">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto rounded-[22px] bg-primary/10 flex items-center justify-center mb-4">
              <Mail className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-[28px] font-bold tracking-tight text-foreground">Forgot Password</h1>
            <p className="text-[15px] text-muted-foreground mt-1">Enter your email to receive a reset link</p>
          </div>
          <div className="liquid-glass p-5">
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[13px] text-muted-foreground">Email Address</Label>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                  className="rounded-xl h-11 glass-input"
                />
              </div>
              <Button type="submit" className="w-full rounded-xl h-11" disabled={loading}>
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
              <button
                type="button"
                onClick={() => setShowForgotPassword(false)}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-3 h-3 inline mr-1" /> Back to Sign In
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const GoogleButton = ({ disabled }: { disabled: boolean }) => (
    <Button
      type="button"
      variant="outline"
      className="w-full rounded-2xl h-12"
      disabled={disabled}
      onClick={async () => { setLoading(true); await handleGoogleSignIn(); setLoading(false); }}
    >
      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      Continue with Google
    </Button>
  );

  return (
    <div className="min-h-screen flex items-center justify-center mesh-gradient p-4">
      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto rounded-[22px] glass-badge flex items-center justify-center mb-4">
            <Sprout className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-[28px] font-bold tracking-tight text-foreground">AgroEye</h1>
          <p className="text-[15px] text-muted-foreground mt-1">Monitor and manage your crops</p>
        </div>

        {/* Biometric Quick Login */}
        {biometricAvailable && biometricEnabled && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4"
          >
            <button
              onClick={handleBiometricAuth}
              disabled={biometricScanning}
              className="w-full liquid-glass p-4 flex flex-col items-center gap-3 active:scale-[0.98] transition-transform"
              aria-label={`Sign in with ${biometricName}`}
            >
              <motion.div
                animate={biometricScanning ? { scale: [1, 1.1, 1], opacity: [1, 0.7, 1] } : {}}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="w-16 h-16 rounded-full glass-badge flex items-center justify-center"
              >
                <BiometricIcon className="w-8 h-8 text-primary" />
              </motion.div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  {biometricScanning ? "Verifying..." : `Sign in with ${biometricName}`}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Tap to authenticate</p>
              </div>
            </button>

            <div className="relative my-4">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-[11px] text-muted-foreground uppercase tracking-wider">
                or sign in manually
              </span>
            </div>
          </motion.div>
        )}

        {/* Auth card */}
        <div className="ios-grouped-section p-5 space-y-4">
          {/* Method toggle */}
          <div className="flex gap-2">
            <Button
              variant={authMethod === "email" ? "default" : "outline"}
              className="flex-1 rounded-xl h-11"
              onClick={() => { setAuthMethod("email"); setOtpSent(false); }}
            >
              <Mail className="w-4 h-4 mr-2" /> Email
            </Button>
            <Button
              variant={authMethod === "phone" ? "default" : "outline"}
              className="flex-1 rounded-xl h-11"
              onClick={() => { setAuthMethod("phone"); setOtpSent(false); }}
            >
              <Phone className="w-4 h-4 mr-2" /> Phone
            </Button>
          </div>

          {authMethod === "phone" ? (
            <div className="space-y-4">
              {!otpSent ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-[13px] text-muted-foreground">Phone Number</Label>
                    <Input id="phone" type="tel" placeholder="+1234567890" value={phone} onChange={(e) => setPhone(e.target.value)} required className="rounded-xl h-11 glass-input" />
                    <p className="text-[11px] text-muted-foreground">Include country code (e.g., +91 for India)</p>
                  </div>
                  <Button onClick={handleSendOtp} className="w-full rounded-xl h-11" disabled={loading}>
                    {loading ? "Sending..." : "Send OTP"}
                  </Button>
                </>
              ) : (
                <>
                  <div className="space-y-2 text-center">
                    <Label className="text-[13px] text-muted-foreground">Enter the 6-digit code sent to {phone}</Label>
                    <div className="flex justify-center">
                      <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                        <InputOTPGroup>
                          {[0,1,2,3,4,5].map(i => <InputOTPSlot key={i} index={i} />)}
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                  </div>
                  <Button onClick={handleVerifyOtp} className="w-full rounded-xl h-11" disabled={loading}>
                    {loading ? "Verifying..." : "Verify & Sign In"}
                  </Button>
                  <button onClick={() => { setOtpSent(false); setOtp(""); }} className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors">
                    Change phone number
                  </button>
                </>
              )}
              <div className="relative my-2">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-[11px] text-muted-foreground uppercase tracking-wider">or</span>
              </div>
              <GoogleButton disabled={loading} />
            </div>
          ) : (
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 rounded-xl h-10 p-1">
                <TabsTrigger value="signin" className="rounded-lg text-[13px]">Sign In</TabsTrigger>
                <TabsTrigger value="signup" className="rounded-lg text-[13px]">Sign Up</TabsTrigger>
              </TabsList>
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-3 pt-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="signin-email" className="text-[13px] text-muted-foreground">Email</Label>
                    <Input id="signin-email" type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="rounded-xl h-11 glass-input" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="signin-password" className="text-[13px] text-muted-foreground">Password</Label>
                      <button
                        type="button"
                        onClick={() => { setForgotEmail(email); setShowForgotPassword(true); }}
                        className="text-[12px] text-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Input id="signin-password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="rounded-xl h-11 glass-input pr-10" />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full rounded-xl h-11" disabled={loading}>
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>
                  <div className="relative my-2">
                    <Separator />
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-[11px] text-muted-foreground uppercase tracking-wider">or</span>
                  </div>
                  <GoogleButton disabled={loading} />
                </form>
              </TabsContent>
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-3 pt-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-name" className="text-[13px] text-muted-foreground">Full Name</Label>
                    <Input id="signup-name" type="text" placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="rounded-xl h-11 glass-input" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-email" className="text-[13px] text-muted-foreground">Email</Label>
                    <Input id="signup-email" type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="rounded-xl h-11 glass-input" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-password" className="text-[13px] text-muted-foreground">Password</Label>
                    <Input id="signup-password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="rounded-xl h-11 glass-input" />
                    {password && (
                      <div className="space-y-1">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4].map((i) => (
                            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= strength ? strengthColor : "bg-muted"}`} />
                          ))}
                        </div>
                        <p className="text-[11px] text-muted-foreground">{strengthLabel}</p>
                      </div>
                    )}
                  </div>
                  <Button type="submit" className="w-full rounded-xl h-11" disabled={loading}>
                    {loading ? "Creating account..." : "Create Account"}
                  </Button>
                  <p className="text-[11px] text-center text-muted-foreground">
                    By signing up, you agree to our{" "}
                    <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>{" "}
                    and{" "}
                    <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
