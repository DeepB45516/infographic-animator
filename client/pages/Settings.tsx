import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, 
  Moon, 
  Sun, 
  Upload, 
  LogOut, 
  User, 
  Palette, 
  Shield,
  Camera
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const Settings = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || 
           (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const handleThemeToggle = (checked) => {
    setIsDarkMode(checked);
    toast.success(`Switched to ${checked ? 'dark' : 'light'} mode`);
  };

  const handleProfilePictureUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error("File size must be less than 5MB");
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        toast.error("Please select an image file");
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        // Here you would typically update the user's profile picture
        // updateUserPicture(e.target.result);
        toast.success("Profile picture updated successfully!");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success("Successfully logged out");
    navigate("/");
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDarkMode 
        ? 'bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900' 
        : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100'
    }`}>
      {/* Header */}
      <header className={`backdrop-blur-sm border-b sticky top-0 z-50 transition-colors duration-300 ${
        isDarkMode 
          ? 'bg-gray-900/80 border-gray-700' 
          : 'bg-white/80 border-slate-200'
      }`}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link 
                to="/dashboard" 
                className={`flex items-center space-x-2 transition-colors ${
                  isDarkMode 
                    ? 'text-gray-400 hover:text-gray-200' 
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Dashboard</span>
              </Link>
              <div className={`h-6 w-px ${isDarkMode ? 'bg-gray-700' : 'bg-slate-300'}`}></div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Settings
              </h1>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className={`text-3xl font-bold mb-2 ${
            isDarkMode ? 'text-gray-100' : 'text-slate-800'
          }`}>
            Account Settings
          </h2>
          <p className={`text-lg ${
            isDarkMode ? 'text-gray-400' : 'text-slate-600'
          }`}>
            Manage your preferences and account information
          </p>
        </div>

        {/* Settings Grid */}
        <div className="grid gap-6">
          {/* Profile Settings */}
          <Card className={`border-0 transition-colors duration-300 ${
            isDarkMode 
              ? 'bg-gray-800/60 backdrop-blur-sm' 
              : 'bg-white/60 backdrop-blur-sm'
          }`}>
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className={`text-xl font-bold ${
                    isDarkMode ? 'text-gray-100' : 'text-slate-800'
                  }`}>
                    Profile Settings
                  </CardTitle>
                  <CardDescription className={isDarkMode ? 'text-gray-400' : 'text-slate-600'}>
                    Manage your profile information and preferences
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Picture Upload */}
              <div className="flex items-center space-x-6">
                <div className="relative group">
                  <Avatar className="h-20 w-20 ring-4 ring-white/20">
                    <AvatarImage src={user?.picture} alt={user?.name || "User"} />
                    <AvatarFallback className="text-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                      {user?.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <Camera className="h-6 w-6 text-white" />
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePictureUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    title="Upload profile picture"
                  />
                </div>
                <div className="flex-1">
                  <h3 className={`text-lg font-semibold ${
                    isDarkMode ? 'text-gray-100' : 'text-slate-800'
                  }`}>
                    {user?.name}
                  </h3>
                  <p className={`${isDarkMode ? 'text-gray-400' : 'text-slate-600'} mb-3`}>
                    {user?.email}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`${
                      isDarkMode 
                        ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                        : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                    onClick={() => document.querySelector('input[type="file"]').click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Change Picture
                  </Button>
                </div>
              </div>

              {/* User Info Display */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className={`p-4 rounded-lg border ${
                  isDarkMode 
                    ? 'bg-gray-700/30 border-gray-600' 
                    : 'bg-slate-50 border-slate-200'
                }`}>
                  <Label className={`text-sm font-medium ${
                    isDarkMode ? 'text-gray-300' : 'text-slate-600'
                  }`}>
                    Full Name
                  </Label>
                  <p className={`text-lg font-semibold ${
                    isDarkMode ? 'text-gray-100' : 'text-slate-800'
                  }`}>
                    {user?.name}
                  </p>
                </div>
                <div className={`p-4 rounded-lg border ${
                  isDarkMode 
                    ? 'bg-gray-700/30 border-gray-600' 
                    : 'bg-slate-50 border-slate-200'
                }`}>
                  <Label className={`text-sm font-medium ${
                    isDarkMode ? 'text-gray-300' : 'text-slate-600'
                  }`}>
                    Email Address
                  </Label>
                  <p className={`text-lg font-semibold ${
                    isDarkMode ? 'text-gray-100' : 'text-slate-800'
                  }`}>
                    {user?.email}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Theme Settings */}
          <Card className={`border-0 transition-colors duration-300 ${
            isDarkMode 
              ? 'bg-gray-800/60 backdrop-blur-sm' 
              : 'bg-white/60 backdrop-blur-sm'
          }`}>
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <Palette className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className={`text-xl font-bold ${
                    isDarkMode ? 'text-gray-100' : 'text-slate-800'
                  }`}>
                    Appearance
                  </CardTitle>
                  <CardDescription className={isDarkMode ? 'text-gray-400' : 'text-slate-600'}>
                    Customize how the application looks and feels
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className={`text-sm font-medium ${
                    isDarkMode ? 'text-gray-200' : 'text-slate-700'
                  }`}>
                    Dark Mode
                  </Label>
                  <p className={`text-sm ${
                    isDarkMode ? 'text-gray-400' : 'text-slate-500'
                  }`}>
                    Switch between light and dark themes
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <Sun className={`h-4 w-4 ${
                    isDarkMode ? 'text-gray-400' : 'text-yellow-500'
                  }`} />
                  <Switch
                    checked={isDarkMode}
                    onCheckedChange={handleThemeToggle}
                  />
                  <Moon className={`h-4 w-4 ${
                    isDarkMode ? 'text-blue-400' : 'text-gray-400'
                  }`} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Actions */}
          <Card className={`border-0 transition-colors duration-300 ${
            isDarkMode 
              ? 'bg-gray-800/60 backdrop-blur-sm' 
              : 'bg-white/60 backdrop-blur-sm'
          }`}>
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className={`text-xl font-bold ${
                    isDarkMode ? 'text-gray-100' : 'text-slate-800'
                  }`}>
                    Account Actions
                  </CardTitle>
                  <CardDescription className={isDarkMode ? 'text-gray-400' : 'text-slate-600'}>
                    Manage your account and security settings
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className={`p-4 rounded-lg border-2 border-dashed transition-colors ${
                  isDarkMode 
                    ? 'border-red-800 bg-red-900/20' 
                    : 'border-red-200 bg-red-50'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`text-lg font-semibold ${
                        isDarkMode ? 'text-red-400' : 'text-red-800'
                      }`}>
                        Sign Out
                      </h3>
                      <p className={`text-sm ${
                        isDarkMode ? 'text-red-300' : 'text-red-600'
                      }`}>
                        Sign out of your account and return to the login page
                      </p>
                    </div>
                    <Button
                      onClick={handleLogout}
                      variant="destructive"
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-slate-500'
          }`}>
            Made with ❤️ for creating amazing infographics
          </p>
        </div>
      </div>
    </div>
  );
};

export default Settings;