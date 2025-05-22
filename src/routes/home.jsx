import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card.jsx";

const HomePage = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen px-6 py-16 bg-white text-black">


            <h1 className="text-4xl md:text-6xl font-extrabold mb-10 tracking-tight text-center">
                AI Interview
            </h1>

            <Card className="max-w-xl w-full p-8 bg-white rounded-xl shadow-lg border border-gray-300">
                <h2 className="text-2xl font-semibold mb-4">
                    Prepare Smarter, Ace Interviews
                </h2>
                <p className="leading-relaxed text-lg text-gray-700">
                    Use AI-powered tools to get personalized feedback and practice targeted interview questions tailored just for you. Improve your skills and increase your chances to land your dream job.
                </p>
            </Card>


            <Link to="/generate" className="mt-10">
                <Button
                    variant="default"
                    className="flex items-center gap-2 px-8 py-3 text-lg font-semibold bg-black text-white hover:bg-gray-800"
                >
                    Generate <Sparkles className="w-5 h-5" />
                </Button>
            </Link>
        </div>
    );
};

export default HomePage;
