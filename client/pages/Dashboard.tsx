import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, BarChart3, FileText, Settings, User, LogOut, GitBranch, Database } from "lucide-react";
import { useStats } from "@/hooks/use-stats";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useEffect } from "react";

export default function Dashboard() {
  const { trackInfographic } = useStats();
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect if not authenticated - moved to useEffect to avoid setState during render
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  // Return loading or null while redirecting
  if (!isAuthenticated) {
    return null;
  }

  const handleCreateNew = async () => {
    if (!user) return;

    const title = `New Infographic ${new Date().toLocaleDateString()}`;
    await trackInfographic(user.id, title);
    toast.success("New infographic project created!");
  };

  const handleLogout = () => {
    logout();
    toast.success("Successfully logged out");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/" className="flex items-center space-x-2 text-slate-600 hover:text-slate-800 transition-colors">
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Home</span>
              </Link>
              <div className="h-6 w-px bg-slate-300"></div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Dashboard
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" asChild>
                <Link to="/settings">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Link>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.picture} alt={user?.name || "User"} />
                      <AvatarFallback>
                        {user?.name?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user?.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/settings" className="flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/settings" className="flex items-center">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Welcome Section */}
        <div className="mb-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-4xl font-bold text-slate-800 mb-3">
                Welcome back, {user?.name?.split(' ')[0] || 'Creator'}! 👋
              </h2>
              <p className="text-lg text-slate-600">Ready to create your next amazing infographic?</p>
            </div>
            <div className="hidden md:block">
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 border-0 shadow-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">0</div>
                  <div className="text-xs text-slate-500">Projects Today</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chart Creation Features */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-3xl font-bold text-slate-800 mb-2">Chart Creation Tools</h3>
              <p className="text-slate-600">Choose your preferred method to create stunning infographics</p>
            </div>
            <Button variant="outline" size="sm" className="hidden md:flex">
              View All Features
            </Button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
            <Link to="/file-to-chart">
              <Card className="group cursor-pointer hover:shadow-xl transition-all duration-300 border-0 bg-white/60 backdrop-blur-sm hover:bg-white/80 transform hover:scale-105">
                <CardContent className="p-8 text-center">
                  <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-blue-500 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:rotate-12 transition-transform duration-300">
                    <FileText className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-3">File to Chart</h3>
                  <p className="text-slate-600 mb-4">Upload CSV, Excel, or JSON files and automatically generate beautiful charts</p>
                  <div className="flex items-center justify-center text-sm text-blue-600 font-medium">
                    Get Started <ArrowLeft className="h-4 w-4 ml-1 rotate-180" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/text-to-chart">
              <Card className="group cursor-pointer hover:shadow-xl transition-all duration-300 border-0 bg-white/60 backdrop-blur-sm hover:bg-white/80 transform hover:scale-105">
                <CardContent className="p-8 text-center">
                  <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:rotate-12 transition-transform duration-300">
                    <BarChart3 className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-3">Text to Chart</h3>
                  <p className="text-slate-600 mb-4">Describe your data in natural language and let AI create charts for you</p>
                  <div className="flex items-center justify-center text-sm text-purple-600 font-medium">
                    Try AI Magic <ArrowLeft className="h-4 w-4 ml-1 rotate-180" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/animate-chart">
              <Card className="group cursor-pointer hover:shadow-xl transition-all duration-300 border-0 bg-white/60 backdrop-blur-sm hover:bg-white/80 transform hover:scale-105">
                <CardContent className="p-8 text-center">
                  <div className="w-20 h-20 bg-gradient-to-r from-orange-500 to-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:rotate-12 transition-transform duration-300">
                    <Plus className="h-10 w-10 text-white animate-pulse" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-3">Animate Charts</h3>
                  <p className="text-slate-600 mb-4">Add stunning animations and interactive elements to bring charts to life</p>
                  <div className="flex items-center justify-center text-sm text-orange-600 font-medium">
                    Add Motion <ArrowLeft className="h-4 w-4 ml-1 rotate-180" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/text-to-uml">
              <Card className="group cursor-pointer hover:shadow-xl transition-all duration-300 border-0 bg-white/60 backdrop-blur-sm hover:bg-white/80 transform hover:scale-105">
                <CardContent className="p-8 text-center">
                  <div className="w-20 h-20 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:rotate-12 transition-transform duration-300">
                    <GitBranch className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-3">Text to UML Diagram</h3>
                  <p className="text-slate-600 mb-4">Create use case and sequence diagrams from text descriptions</p>
                  <div className="flex items-center justify-center text-sm text-cyan-600 font-medium">
                    Generate UML <ArrowLeft className="h-4 w-4 ml-1 rotate-180" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/text-to-er-diagram">
              <Card className="group cursor-pointer hover:shadow-xl transition-all duration-300 border-0 bg-white/60 backdrop-blur-sm hover:bg-white/80 transform hover:scale-105">
                <CardContent className="p-8 text-center">
                  <div className="w-20 h-20 bg-gradient-to-r from-teal-500 to-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:rotate-12 transition-transform duration-300">
                    <Database className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-3">ER Diagram</h3>
                  <p className="text-slate-600 mb-4">Create entity-relationship diagrams from database descriptions</p>
                  <div className="flex items-center justify-center text-sm text-teal-600 font-medium">
                    Design Database <ArrowLeft className="h-4 w-4 ml-1 rotate-180" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        {/* Section Separator */}
        <div className="flex items-center my-12">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent"></div>
          <div className="px-4 text-slate-500 text-sm">More Tools</div>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent"></div>
        </div>

        {/* Quick Actions */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold text-slate-800 mb-1">Quick Actions</h3>
              <p className="text-slate-600">Fast access to common tasks</p>
            </div>
          </div>
          <div className="grid md:grid-cols-4 gap-4">
            <Card
              className="cursor-pointer hover:shadow-lg transition-all duration-300 border-0 bg-white/60 backdrop-blur-sm"
              onClick={handleCreateNew}
            >
              <CardContent className="p-4 text-center">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Plus className="h-6 w-6 text-white" />
                </div>
                <h4 className="font-semibold text-slate-800 mb-1">Create New</h4>
                <p className="text-xs text-slate-600">Start from scratch</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 border-0 bg-white/60 backdrop-blur-sm">
              <CardContent className="p-4 text-center">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <h4 className="font-semibold text-slate-800 mb-1">Templates</h4>
                <p className="text-xs text-slate-600">Browse designs</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 border-0 bg-white/60 backdrop-blur-sm">
              <CardContent className="p-4 text-center">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <h4 className="font-semibold text-slate-800 mb-1">Analytics</h4>
                <p className="text-xs text-slate-600">View insights</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 border-0 bg-white/60 backdrop-blur-sm" asChild>
              <Link to="/settings">
                <CardContent className="p-4 text-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Settings className="h-6 w-6 text-white" />
                  </div>
                  <h4 className="font-semibold text-slate-800 mb-1">Settings</h4>
                  <p className="text-xs text-slate-600">Preferences</p>
                </CardContent>
              </Link>
            </Card>
          </div>
        </div>

        {/* Recent Projects and Stats Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="border-0 bg-white/60 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold text-slate-800">Recent Projects</CardTitle>
                    <CardDescription>Your latest infographic creations</CardDescription>
                  </div>
                  <Button variant="outline" size="sm">View All</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gradient-to-r from-slate-200 to-slate-300 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-8 w-8 text-slate-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-600 mb-2">No projects yet</h3>
                  <p className="text-slate-500 mb-4">Get started by creating your first infographic</p>
                  <Button
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                    onClick={handleCreateNew}
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Project
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="border-0 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold">0</div>
                    <div className="text-blue-100">Total Projects</div>
                  </div>
                  <BarChart3 className="h-8 w-8 text-blue-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-gradient-to-r from-green-500 to-blue-500 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold">0</div>
                    <div className="text-green-100">Charts Created</div>
                  </div>
                  <FileText className="h-8 w-8 text-green-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold">0</div>
                    <div className="text-purple-100">Animations</div>
                  </div>
                  <Plus className="h-8 w-8 text-purple-200" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Getting Started Tips */}
        <div className="mt-8">
          <Card className="border-0 bg-gradient-to-r from-slate-50 to-blue-50">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                  <User className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">Welcome to Your Dashboard!</h3>
                  <p className="text-slate-600 mb-4">
                    Start by exploring our five powerful chart creation tools above. Each tool is designed to help you create professional infographics quickly and easily.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/file-to-chart">Try File Upload</Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/text-to-chart">Try AI Generation</Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/animate-chart">Try Animations</Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/text-to-er-diagram">Try ER Diagrams</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}