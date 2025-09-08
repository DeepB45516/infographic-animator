import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Play, Zap, TrendingUp, Users, Star, ArrowRight, Sparkles, BarChart3, PieChart, FileText, RefreshCw, Mail, Lock, Eye, EyeOff, Rocket, Globe, Layers, Cpu } from "lucide-react";
import { useStats } from "@/hooks/use-stats";
import { useAuth } from "@/contexts/AuthContext";
import { GoogleLoginButton } from "@/components/GoogleLoginButton";
import { toast } from "sonner";

// Floating particles component
const FloatingParticles = ({ count = 30 }) => {
  const particles = Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 6 + 2,
    duration: Math.random() * 20 + 10,
    delay: Math.random() * 5,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full bg-gradient-to-r from-blue-400/20 to-purple-400/20 animate-pulse"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            animation: `float ${particle.duration}s ease-in-out infinite ${particle.delay}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.7; }
          50% { transform: translateY(-20px) rotate(180deg); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default function Index() {
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const { stats, loading, error } = useStats(30000); // Refresh every 30 seconds
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);

  // Parallax scroll effect
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Intersection Observer for scroll animations
  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
        }
      });
    }, observerOptions);

    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    animatedElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  const handleLoginSuccess = () => {
    toast.success("Successfully signed in with Google!");
    navigate("/dashboard");
  };

  const handleLoginError = (error: string) => {
    toast.error(`Login failed: ${error}`);
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Please enter both email and password");
      return;
    }

    setIsLoading(true);

    try {
      // For demo purposes, simulate login
      await new Promise(resolve => setTimeout(resolve, 1000));

      // In a real app, you would make an API call here
      if (email.includes("@") && password.length >= 6) {
        toast.success("Successfully signed in!");
        navigate("/dashboard");
      } else {
        toast.error("Invalid email or password. Please check your credentials.");
      }
    } catch (error) {
      toast.error("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    {
      icon: <BarChart3 className="h-8 w-8" />,
      title: "Interactive Charts",
      description: "Create stunning animated charts and graphs that tell your story",
      gradient: "from-blue-500 to-cyan-500",
      hoverGradient: "from-blue-600 to-cyan-600"
    },
    {
      icon: <Rocket className="h-8 w-8" />,
      title: "Lightning Fast",
      description: "Transform data into engaging visual narratives with smooth animations",
      gradient: "from-purple-500 to-pink-500",
      hoverGradient: "from-purple-600 to-pink-600"
    },
    {
      icon: <Globe className="h-8 w-8" />,
      title: "Global Reach",
      description: "Share your creations with the world through seamless publishing",
      gradient: "from-green-500 to-emerald-500",
      hoverGradient: "from-green-600 to-emerald-600"
    },
    {
      icon: <Cpu className="h-8 w-8" />,
      title: "AI-Powered Design",
      description: "Let AI suggest the best visual approaches for your data",
      gradient: "from-orange-500 to-red-500",
      hoverGradient: "from-orange-600 to-red-600"
    }
  ];

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const statsData = stats ? [
    { number: formatNumber(stats.totalInfographics), label: "Infographics Created" },
    { number: formatNumber(stats.totalUsers), label: "Happy Users" },
    { number: `${stats.uptime}%`, label: "Uptime" },
    { number: `${stats.averageRating}���`, label: "User Rating" }
  ] : [
    { number: "...", label: "Infographics Created" },
    { number: "...", label: "Happy Users" },
    { number: "...", label: "Uptime" },
    { number: "...", label: "User Rating" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Global styles for animations */}
      <style>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideInUp {
          from { transform: translateY(50px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.5); }
          50% { box-shadow: 0 0 40px rgba(59, 130, 246, 0.8), 0 0 60px rgba(147, 51, 234, 0.4); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
        }
        .animate-on-scroll {
          opacity: 0;
          transform: translateY(30px);
          transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        .animate-in {
          opacity: 1;
          transform: translateY(0);
        }
        .card-hover {
          transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        .card-hover:hover {
          transform: translateY(-10px) rotateX(5deg);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }
      `}</style>

      {/* Floating Particles */}
      <FloatingParticles count={40} />

      {/* Hero Section */}
      <div ref={heroRef} className="relative overflow-hidden min-h-screen flex items-center">
        {/* Dynamic background elements */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Animated gradients */}
          <div
            className="absolute -top-40 -right-32 w-80 h-80 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full opacity-30 blur-3xl"
            style={{
              transform: `translateY(${scrollY * 0.2}px) rotate(${scrollY * 0.1}deg)`,
              animation: 'pulse 4s ease-in-out infinite'
            }}
          ></div>
          <div
            className="absolute -bottom-40 -left-32 w-80 h-80 bg-gradient-to-r from-green-400 to-blue-500 rounded-full opacity-30 blur-3xl"
            style={{
              transform: `translateY(${scrollY * -0.3}px) rotate(${-scrollY * 0.1}deg)`,
              animation: 'pulse 6s ease-in-out infinite 2s'
            }}
          ></div>
          <div
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full opacity-20 blur-2xl"
            style={{
              transform: `translate(-50%, -50%) translateY(${scrollY * 0.1}px)`,
              animation: 'pulse 8s ease-in-out infinite 1s'
            }}
          ></div>

          {/* Grid pattern overlay */}
          <div className="absolute inset-0 opacity-10">
            <div className="h-full w-full bg-grid-white/[0.2] bg-[size:50px_50px]" />
          </div>
        </div>

        <div className="relative z-10 container mx-auto px-4 py-20">
          <div className="text-center">
            {/* Animated logo with multiple effects */}
            <div className="flex items-center justify-center mb-8">
              <div className="relative group">
                {/* Pulse rings */}
                <div className="absolute inset-0 rounded-2xl animate-ping bg-gradient-to-r from-blue-600 to-purple-600 opacity-20"></div>
                <div className="absolute inset-0 rounded-2xl animate-pulse bg-gradient-to-r from-blue-600 to-purple-600 opacity-30"></div>

                {/* Main logo */}
                <div
                  className="relative w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center transform transition-all duration-500 hover:scale-110 shadow-2xl group-hover:shadow-blue-500/50"
                  style={{ animation: 'glow 3s ease-in-out infinite' }}
                >
                  <TrendingUp className="h-10 w-10 text-white animate-bounce" />
                  <div className="absolute -top-3 -right-3 w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-bounce delay-300 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                </div>
              </div>

              <div className="ml-6">
                <h1
                  className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-pulse"
                  style={{ animation: 'slideInRight 1s ease-out' }}
                >
                  Infographic
                </h1>
                <h1
                  className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent"
                  style={{ animation: 'slideInLeft 1s ease-out 0.3s both' }}
                >
                  Animator
                </h1>
              </div>
            </div>

            {/* Hero content with staggered animations */}
            <div className="max-w-5xl mx-auto space-y-8">
              <h2
                className="text-3xl md:text-5xl font-bold text-white leading-tight"
                style={{ animation: 'slideInUp 1s ease-out 0.6s both' }}
              >
                Transform Your Data Into{' '}
                <span className="relative inline-block">
                  <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                    Stunning Animated Stories
                  </span>
                  <div className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full animate-pulse"></div>
                </span>
              </h2>

              <p
                className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed"
                style={{ animation: 'slideInUp 1s ease-out 0.9s both' }}
              >
                Create captivating infographics with powerful animations, interactive charts, and professional templates.
                <span className="text-blue-400 font-semibold"> No design experience required.</span>
              </p>

              {/* Enhanced badges with animations */}
              <div
                className="flex flex-wrap gap-4 justify-center items-center"
                style={{ animation: 'slideInUp 1s ease-out 1.2s both' }}
              >
                <Badge className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 text-base font-semibold hover:scale-105 transition-transform duration-300">
                  <Star className="h-5 w-5 mr-2 animate-spin" style={{ animationDuration: '3s' }} />
                  Free to start
                </Badge>
                <Badge className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 text-base font-semibold hover:scale-105 transition-transform duration-300">
                  <Zap className="h-5 w-5 mr-2 animate-bounce" />
                  No credit card required
                </Badge>
                <Badge className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 text-base font-semibold hover:scale-105 transition-transform duration-300">
                  <Users className="h-5 w-5 mr-2 animate-pulse" />
                  Join {stats ? formatNumber(stats.totalUsers) : "50K"}+ creators
                </Badge>
              </div>

              {/* Call to action with special effects */}
              <div
                className="flex flex-col sm:flex-row gap-6 justify-center items-center mt-12"
                style={{ animation: 'slideInUp 1s ease-out 1.5s both' }}
              >
                <Button
                  asChild
                  className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 text-lg font-semibold transition-all duration-500 shadow-2xl hover:shadow-blue-500/50 hover:scale-105"
                >
                  <Link to="/dashboard" className="flex items-center justify-center">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-lg blur opacity-75 group-hover:opacity-100 transition duration-300"></div>
                    <span className="relative flex items-center">
                      <Rocket className="h-6 w-6 mr-3 animate-bounce" />
                      Start Creating
                      <ArrowRight className="h-5 w-5 ml-3 group-hover:translate-x-1 transition-transform duration-300" />
                    </span>
                  </Link>
                </Button>

                <Button
                  variant="outline"
                  className="px-8 py-4 bg-white/10 backdrop-blur-sm border-white/20 text-white text-lg font-semibold hover:bg-white/20 transition-all duration-300 hover:scale-105"
                >
                  <Play className="h-6 w-6 mr-3" />
                  Watch Demo
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white/60 rounded-full mt-2 animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Enhanced Authentication Section */}
      <div className="relative py-32 bg-gradient-to-b from-slate-900 to-slate-800">
        <div className="container mx-auto px-4">
          <div className="max-w-lg mx-auto">
            <div className="animate-on-scroll">
              <Card className="relative backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl card-hover overflow-hidden">
                {/* Animated border */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 p-[1px] rounded-lg">
                  <div className="h-full w-full bg-slate-900/90 backdrop-blur-xl rounded-lg"></div>
                </div>

                <div className="relative z-10 p-8">
                  <CardHeader className="text-center pb-6">
                    <div className="flex justify-center mb-4">
                      <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center animate-pulse">
                        <Sparkles className="h-8 w-8 text-white" />
                      </div>
                    </div>
                    <CardTitle className="text-3xl font-bold text-white mb-2">Get Started Today</CardTitle>
                    <CardDescription className="text-gray-300 text-lg">
                      Join thousands of creators making amazing infographics
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    <div className="relative">
                      <GoogleLoginButton
                        onSuccess={handleLoginSuccess}
                        onError={handleLoginError}
                      />
                    </div>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-white/20"></span>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-4 bg-slate-900 text-gray-400">or continue with email</span>
                      </div>
                    </div>

                    <form onSubmit={handleEmailLogin} className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium text-gray-300">
                          Email Address
                        </Label>
                        <div className="relative group">
                          <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-400 transition-colors" />
                          <Input
                            id="email"
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="pl-12 h-12 bg-white/5 border-white/20 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500/50 focus:bg-white/10 transition-all duration-300"
                            disabled={isLoading}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="password" className="text-sm font-medium text-gray-300">
                          Password
                        </Label>
                        <div className="relative group">
                          <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-400 transition-colors" />
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="pl-12 pr-12 h-12 bg-white/5 border-white/20 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500/50 focus:bg-white/10 transition-all duration-300"
                            disabled={isLoading}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                            disabled={isLoading}
                          >
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 transition-all duration-300 shadow-lg hover:shadow-blue-500/25 hover:scale-[1.02] font-semibold text-base"
                      >
                        {isLoading ? (
                          <>
                            <RefreshCw className="h-5 w-5 mr-3 animate-spin" />
                            Signing in...
                          </>
                        ) : (
                          <>
                            <Mail className="h-5 w-5 mr-3" />
                            Sign in with Email
                          </>
                        )}
                      </Button>
                    </form>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-white/20"></span>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-4 bg-slate-900 text-gray-400">or</span>
                      </div>
                    </div>

                    <Button
                      asChild
                      className="w-full h-14 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white border-0 transition-all duration-500 shadow-lg hover:shadow-emerald-500/25 transform hover:scale-[1.02] text-lg font-semibold"
                    >
                      <Link to="/dashboard" className="flex items-center justify-center">
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-blue-400 rounded-lg blur opacity-75 group-hover:opacity-100 transition duration-300"></div>
                        <span className="relative flex items-center">
                          <Rocket className="h-6 w-6 mr-3 animate-bounce" />
                          Start Creating for Free
                          <ArrowRight className="h-5 w-5 ml-3 group-hover:translate-x-1 transition-transform duration-300" />
                        </span>
                      </Link>
                    </Button>

                    <p className="text-xs text-gray-400 text-center leading-relaxed">
                      By signing up, you agree to our{" "}
                      <span className="text-blue-400 hover:text-blue-300 cursor-pointer transition-colors">Terms of Service</span>{" "}
                      and{" "}
                      <span className="text-blue-400 hover:text-blue-300 cursor-pointer transition-colors">Privacy Policy</span>
                    </p>
                  </CardContent>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Features Section */}
      <div className="relative py-32 bg-gradient-to-b from-slate-800 to-slate-900 overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:60px_60px]" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-20 animate-on-scroll">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl mb-6 animate-pulse">
              <Layers className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-5xl font-bold text-white mb-6">
              Powerful{" "}
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Features
              </span>
            </h3>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Everything you need to create professional infographics with stunning animations
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="animate-on-scroll"
                style={{ animationDelay: `${index * 0.2}s` }}
              >
                <Card
                  className={`group relative cursor-pointer transition-all duration-500 border-0 bg-white/5 backdrop-blur-xl hover:bg-white/10 card-hover overflow-hidden ${
                    hoveredFeature === index ? 'shadow-2xl' : 'shadow-lg'
                  }`}
                  onMouseEnter={() => setHoveredFeature(index)}
                  onMouseLeave={() => setHoveredFeature(null)}
                >
                  {/* Animated border gradient */}
                  <div className={`absolute inset-0 bg-gradient-to-r ${feature.gradient} opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-xl`}></div>
                  <div className={`absolute inset-[1px] bg-gradient-to-r ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-lg`}>
                    <div className="h-full w-full bg-slate-900/90 backdrop-blur-xl rounded-lg"></div>
                  </div>

                  <CardContent className="relative z-10 p-8 text-center">
                    {/* Icon with multiple animation layers */}
                    <div className="relative mb-6 flex justify-center">
                      {/* Background glow */}
                      <div className={`absolute w-20 h-20 bg-gradient-to-r ${feature.gradient} rounded-2xl opacity-20 blur-xl group-hover:opacity-40 transition-opacity duration-500`}></div>

                      {/* Main icon container */}
                      <div className={`relative w-16 h-16 bg-gradient-to-r ${hoveredFeature === index ? feature.hoverGradient : feature.gradient} rounded-2xl flex items-center justify-center transition-all duration-500 transform ${
                        hoveredFeature === index
                          ? 'scale-110 rotate-12 shadow-2xl'
                          : 'group-hover:scale-105'
                      }`}>
                        <div className="text-white transform transition-transform duration-300 group-hover:scale-110">
                          {feature.icon}
                        </div>

                        {/* Pulse rings */}
                        {hoveredFeature === index && (
                          <>
                            <div className="absolute inset-0 rounded-2xl border-2 border-white/30 animate-ping"></div>
                            <div className="absolute inset-0 rounded-2xl border border-white/20 animate-pulse"></div>
                          </>
                        )}
                      </div>
                    </div>

                    <h4 className="text-2xl font-bold text-white mb-4 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-blue-400 group-hover:to-purple-400 group-hover:bg-clip-text transition-all duration-300">
                      {feature.title}
                    </h4>
                    <p className="text-gray-300 leading-relaxed group-hover:text-white transition-colors duration-300">
                      {feature.description}
                    </p>

                    {/* Hover indicator */}
                    <div className={`mt-6 flex items-center justify-center text-blue-400 opacity-0 group-hover:opacity-100 transition-all duration-300 transform ${
                      hoveredFeature === index ? 'translate-y-0' : 'translate-y-2'
                    }`}>
                      <span className="text-sm font-medium">Learn more</span>
                      <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>

          {/* Call to action */}
          <div className="text-center mt-20 animate-on-scroll">
            <Button
              asChild
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 text-lg font-semibold transition-all duration-500 shadow-2xl hover:shadow-blue-500/50 hover:scale-105"
            >
              <Link to="/dashboard" className="flex items-center justify-center">
                <Sparkles className="h-6 w-6 mr-3 animate-spin" style={{ animationDuration: '3s' }} />
                Explore All Features
                <ArrowRight className="h-5 w-5 ml-3" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Enhanced Stats Section */}
      <div className="relative py-32 bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900 overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-60 h-60 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl animate-pulse delay-500"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="animate-on-scroll">
            <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 md:p-16 text-white shadow-2xl">
              <div className="text-center mb-16">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-3xl mb-8 animate-bounce">
                  <Globe className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-5xl font-bold mb-6">
                  Trusted by{" "}
                  <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    Creators Worldwide
                  </span>
                </h3>
                <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
                  Join our growing community of content creators and data storytellers
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
                {statsData.map((stat, index) => (
                  <div
                    key={index}
                    className="text-center group hover:scale-105 transition-transform duration-300"
                  >
                    <div className="relative mb-4">
                      {/* Glow effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-300"></div>

                      {/* Number container */}
                      <div className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 group-hover:bg-white/10 transition-all duration-300">
                        <div className={`text-4xl md:text-6xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent ${
                          loading ? 'animate-pulse' : ''
                        }`}>
                          {stat.number}
                        </div>
                        <div className="text-gray-300 text-lg font-medium group-hover:text-white transition-colors duration-300">
                          {stat.label}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Live status indicators */}
              {stats && (
                <div className="text-center mt-12">
                  <div className="inline-flex items-center gap-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl px-8 py-4">
                    <div className="flex items-center gap-2 text-gray-300">
                      <RefreshCw className="h-4 w-4 animate-spin" style={{ animationDuration: '3s' }} />
                      <span className="text-sm">Live: {stats.lastUpdated.toLocaleTimeString()}</span>
                    </div>
                    {stats.activeSessions > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                          <div className="absolute inset-0 w-3 h-3 bg-green-400 rounded-full animate-ping"></div>
                        </div>
                        <span className="text-green-400 text-sm font-medium">
                          {stats.activeSessions} creating now
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-yellow-400">
                      <Star className="h-4 w-4 fill-current" />
                      <span className="text-sm">{stats.averageRating} rating</span>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="text-center mt-8">
                  <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-6 py-3 text-red-300">
                    <span className="text-sm">{error}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Footer */}
      <footer className="relative bg-slate-900 border-t border-white/10">
        <div className="container mx-auto px-4 py-16">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mr-4">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white">Infographic Animator</h3>
              </div>
              <p className="text-gray-400 mb-6 max-w-md leading-relaxed">
                Transform your data into stunning animated stories. Create professional infographics with no design experience required.
              </p>
              <div className="flex gap-4">
                <Button size="sm" variant="outline" className="border-white/20 text-gray-300 hover:text-white hover:bg-white/10">
                  <Star className="h-4 w-4 mr-2" />
                  Rate us
                </Button>
                <Button size="sm" variant="outline" className="border-white/20 text-gray-300 hover:text-white hover:bg-white/10">
                  <Users className="h-4 w-4 mr-2" />
                  Community
                </Button>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-3 text-gray-400">
                <li><Link to="/dashboard" className="hover:text-white transition-colors">Dashboard</Link></li>
                <li><Link to="/file-to-chart" className="hover:text-white transition-colors">File to Chart</Link></li>
                <li><Link to="/text-to-chart" className="hover:text-white transition-colors">Text to Chart</Link></li>
                <li><Link to="/animate-chart" className="hover:text-white transition-colors">Animate Charts</Link></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="text-white font-semibold mb-4">Support</h4>
              <ul className="space-y-3 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 text-center">
            <p className="text-gray-400">
              &copy; 2024 Infographic Animator. All rights reserved. Made with{" "}
              <span className="text-red-400 animate-pulse">♥</span> for creators worldwide.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
