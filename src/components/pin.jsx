import { useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import {
    Card,
    CardDescription,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "./ui/badge";
import { Eye, Trash2, Newspaper, Sparkles, RefreshCw } from "lucide-react";
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/config/firebase.config";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export const InterviewPin = ({ interview, onMockPage = false, allAnswered, onDeleted }) => {
    const navigate = useNavigate();
    const { userId } = useAuth();

    const handleNavigate = (path) => {
        navigate(path);
    };

    const handleDeleteResponses = async () => {
        if (!userId) {
            toast.error("You need to be signed in to delete responses");
            return;
        }
        if (!confirm("Are you sure you want to delete all your responses for this interview?")) {
            return;
        }
        try {
            const userAnswersQuery = query(
                collection(db, "userAnswers"),
                where("userId", "==", userId),
                where("mockIdRef", "==", interview.id)
            );
            const querySnapshot = await getDocs(userAnswersQuery);
            if (querySnapshot.empty) {
                toast.info("No saved responses to delete");
                return;
            }
            const deletePromises = querySnapshot.docs.map((docSnap) =>
                deleteDoc(doc(db, "userAnswers", docSnap.id))
            );
            await Promise.all(deletePromises);
            toast.success("Deleted all responses for this interview");
            if (onDeleted) {
                onDeleted(interview.id);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete responses");
        }
    };

    const handleDeleteInterview = async () => {
        if (!userId) {
            toast.error("You need to be signed in to delete the interview");
            return;
        }
        if (!confirm("Are you sure you want to delete this entire interview? This action cannot be undone.")) {
            return;
        }
        try {
            await deleteDoc(doc(db, "interviews", interview.id));
            const userAnswersQuery = query(
                collection(db, "userAnswers"),
                where("mockIdRef", "==", interview.id)
            );
            const querySnapshot = await getDocs(userAnswersQuery);
            const deletePromises = querySnapshot.docs.map((docSnap) =>
                deleteDoc(doc(db, "userAnswers", docSnap.id))
            );
            await Promise.all(deletePromises);
            toast.success("Interview and all responses deleted successfully");
            if (onDeleted) {
                onDeleted(interview.id);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete interview");
        }
    };

    return (
        <Card className="p-4 rounded-md shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer space-y-1">
            <div className="flex justify-between items-center gap-2">
                <CardTitle className="text-lg font-semibold flex-1">{interview?.position}</CardTitle>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-gray-700 hover:text-black transition-colors"
                        onClick={() => handleNavigate(`/generate/${interview?.id}`)}
                        aria-label="View"
                    >
                        <Eye size={20} />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-gray-700 hover:text-black transition-colors"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteInterview();
                        }}
                        aria-label="Delete Interview"
                    >
                        <Trash2 size={20} />
                    </Button>
                </div>
            </div>

            <CardDescription className="text-gray-600 leading-relaxed">{interview?.description}</CardDescription>

            <div className="flex flex-wrap gap-1 max-w-full">
                {(interview?.techStack || "")
                    .split(",")
                    .map((word, index) => (
                        <Badge
                            key={index}
                            variant="outline"
                            className="text-xs text-gray-500 border-gray-300 hover:border-gray-600 hover:bg-gray-100 hover:text-gray-900 cursor-default transition-colors"
                        >
                            {word.trim()}
                        </Badge>
                    ))}
            </div>

             <div className="flex justify-between items-center flex-wrap gap-2">
                <p className="text-sm text-gray-500 truncate whitespace-nowrap max-w-[70%]">
                    {interview?.createdAt
                        ? `${new Date(interview.createdAt.toDate()).toLocaleDateString("en-US", {
                            dateStyle: "long",
                        })} - ${new Date(interview.createdAt.toDate()).toLocaleTimeString("en-US", {
                            timeStyle: "short",
                        })}`
                        : ""}
                </p>
            </div>


            {!onMockPage && (
                <div className="flex justify-between items-center flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                        <Button
                            variant="outline"
                            className="flex items-center gap-1 text-gray-700 border-gray-300 hover:bg-gray-200 hover:text-black hover:border-gray-600 transition"
                            onClick={() => handleNavigate(`/generate/feedback/${interview?.id}`)}
                            aria-label="Feedback"
                        >
                            <Newspaper size={16} />
                            <span className="text-sm font-medium hidden sm:hidden">Feedback</span>
                        </Button>

                        {allAnswered && (
                            <Button
                                variant="outline"
                                className="flex items-center gap-1 text-gray-700 border-gray-300 hover:bg-gray-200 hover:text-black hover:border-gray-600 transition"
                                onClick={handleDeleteResponses}
                                aria-label="Delete Responses"
                            >
                                <RefreshCw size={16} />
                                <span className="text-sm font-medium hidden sm:hidden">Delete Responses</span>
                            </Button>
                        )}
                    </div>

                    <div className="ml-auto">
                        <Button
                            variant="outline"
                            className="flex items-center gap-1 text-gray-700 border-gray-300 hover:bg-gray-200 hover:text-black hover:border-gray-600 transition"
                            onClick={() => handleNavigate(`/generate/interview/${interview?.id}/start`)}
                            aria-label="Start"
                        >
                            <Sparkles size={16} />
                            <span className="text-sm font-medium hidden sm:inline">Start</span>
                        </Button>
                    </div>
                </div>
            )}
        </Card>
    );
};
