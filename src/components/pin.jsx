import { useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import {
    Card,
    CardDescription,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "./ui/badge";
import { Eye, Trash2, Newspaper, Sparkles } from "lucide-react";
import {
    collection,
    query,
    where,
    getDocs,
    deleteDoc,
    doc,
} from "firebase/firestore";
import { db } from "@/config/firebase.config";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";


export const InterviewPin = ({
                                 interview,
                                 feedbackBySection = [],
                                 onMockPage = false,

                                 onDeleted,
                             }) => {
    const navigate = useNavigate();
    const { userId } = useAuth();

    const handleNavigate = (path) => navigate(path);





    const handleDeleteInterview = () => {
        if (!userId) {
            return toast.error("You need to be signed in to delete this interview.");
        }

        toast(
            "Confirm Delete?",
            {
                description: "Click 'Delete' below to confirm interview deletion. This cannot be undone.",
                action: {
                    label: "Delete",
                    onClick: async () => {
                        try {

                            await deleteDoc(doc(db, "interviews", interview.id));


                            const q = query(
                                collection(db, "userAnswers"),
                                where("mockIdRef", "==", interview.id)
                            );
                            const snapshot = await getDocs(q);
                            await Promise.all(
                                snapshot.docs.map((docSnap) =>
                                    deleteDoc(doc(db, "userAnswers", docSnap.id))
                                )
                            );

                            toast.success("Interview and all responses deleted successfully.");
                            onDeleted?.(interview.id);
                        } catch (error) {
                            console.error("Delete error:", error);
                            toast.error("Failed to delete interview. Please try again.");
                        }
                    },
                },
            }
        );
    };

    return (
        <Card className="p-4 rounded-md shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer">
            <div className="flex justify-between items-center gap-2 mb-1">
                <CardTitle className="text-lg font-semibold">{interview?.position}</CardTitle>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-gray-700 hover:text-black"
                        onClick={() => handleNavigate(`/generate/${interview?.id}`)}
                        aria-label="View Interview"
                    >
                        <Eye size={20} />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-gray-700 hover:text-black"
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

            <CardDescription className="text-gray-600 text-sm mb-2">
                {interview?.description}
            </CardDescription>

            <div className="flex flex-wrap gap-1 mb-2">
                {(interview?.techStack || "")
                    .split(",")
                    .map((tech, index) => (
                        <Badge
                            key={index}
                            variant="outline"
                            className="text-xs text-gray-500 border-gray-300"
                        >
                            {tech.trim()}
                        </Badge>
                    ))}
            </div>

            <div className="flex flex-wrap gap-1 mb-2">
                {(feedbackBySection.length > 0
                        ? feedbackBySection
                        : interview?.sections || []
                ).map((section) => {
                    const hasFeedback = section.feedbacks?.length > 0;
                    return (
                        <Badge
                            key={section.type}
                            variant={hasFeedback ? "green" : "outline"}
                            className={`text-xs ${
                                hasFeedback
                                    ? "bg-green-100 text-green-800 border-green-300"
                                    : "text-gray-500 border-gray-300"
                            }`}
                            title={
                                hasFeedback
                                    ? `${section.type} section completed`
                                    : `${section.type} section - no feedback`
                            }
                        >
                            {section.type}
                        </Badge>
                    );
                })}
            </div>

            <p className="text-xs text-gray-500 truncate mb-2">
                {interview?.createdAt
                    ? `${new Date(interview.createdAt.toDate()).toLocaleDateString()} — ${new Date(
                        interview.createdAt.toDate()
                    ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                    : ""}
            </p>

            {!onMockPage && (
                <div className="flex justify-between items-center mt-1">
                    <div className="flex items-center gap-1 flex-wrap">
                        <Button
                            variant="outline"
                            className="gap-1 text-gray-700 border-gray-300 hover:bg-gray-200 hover:text-black"
                            onClick={() => handleNavigate(`/generate/feedback/${interview?.id}`)}
                        >
                            <Newspaper size={16} />
                            <span className="text-sm font-medium hidden sm:inline">Feedback</span>
                        </Button>
                    </div>
                    <Button
                        variant="outline"
                        className="gap-1 text-gray-700 border-gray-300 hover:bg-gray-200 hover:text-black"
                        onClick={() => handleNavigate(`/generate/interview/${interview?.id}/start`)}
                    >
                        <Sparkles size={16} />
                        <span className="text-sm font-medium hidden sm:inline">Start</span>
                    </Button>
                </div>
            )}
        </Card>
    );
};
