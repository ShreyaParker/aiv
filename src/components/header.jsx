import { useAuth } from "@clerk/clerk-react";
import { NavLink } from "react-router-dom";
import { ProfileContainer } from "./profile-container.jsx";
import { Button } from "@/components/ui/button";
import { ScanEye } from "lucide-react";

const Header = () => {
    const { userId } = useAuth();

    return (
        <header className="w-full bg-white border-b shadow dark:shadow-md">
            <div className="max-w-screen-xl mx-auto px-4 py-4 flex items-center justify-between">
                <div className="flex items-center text-black font-bold text-lg">
                    <ScanEye className="w-6 h-6" />
                    <span className="ml-1">AIV</span>
                </div>


                <div className="flex items-center gap-6">
                    {userId && (
                        <>
                            <NavLink to="/" end>
                                {({ isActive }) => (
                                    <Button
                                        variant={isActive ? "default" : "ghost"}
                                        className={
                                            isActive
                                                ? "bg-black text-white hover:bg-gray-900"
                                                : "text-gray-600 hover:text-black"
                                        }
                                    >
                                        Home
                                    </Button>
                                )}
                            </NavLink>

                            <NavLink to="/generate">
                                {({ isActive }) => (
                                    <Button
                                        variant={isActive ? "default" : "ghost"}
                                        className={
                                            isActive
                                                ? "bg-black text-white hover:bg-gray-900"
                                                : "text-gray-600 hover:text-black"
                                        }
                                    >
                                        Dashboard
                                    </Button>
                                )}
                            </NavLink>
                        </>
                    )}

                      <ProfileContainer />
                </div>
            </div>
        </header>
    );
};

export default Header;
