import { InterviewPin } from "@/components/pin.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Separator } from "@/components/ui/separator.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import { db } from "@/config/firebase.config";
import { useAuth } from "@clerk/clerk-react";
import {
    collection,
    onSnapshot,
    query,
    where,
    getDocs,
} from "firebase/firestore";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { toast } from "sonner";

export const Dashboard = () => {
    const [interviews, setInterviews] = useState([]);
    const [loading, setLoading] = useState(false);
    const { userId } = useAuth();
    const [answeredMap, setAnsweredMap] = useState({});

    useEffect(() => {
        if (!userId) return;

        setLoading(true);
        const interviewQuery = query(
            collection(db, "interviews"),
            where("userId", "==", userId)
        );

        const unsubscribe = onSnapshot(
            interviewQuery,
            (snapshot) => {
                const interviewList = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                setInterviews(interviewList);
                setLoading(false);
            },
            (error) => {
                console.log("Error on fetching: ", error);
                toast.error("Error..", {
                    description: "Something went wrong.. Try again later..",
                });
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [userId]);

      useEffect(() => {
        if (!userId || interviews.length === 0) return;

        async function fetchAnsweredCounts() {
            const newAnsweredMap = {};
            for (const interview of interviews) {
                const q = query(
                    collection(db, "userAnswers"),
                    where("userId", "==", userId),
                    where("mockIdRef", "==", interview.id)
                );
                const snapshot = await getDocs(q);
                const answeredQuestionsSet = new Set();
                snapshot.forEach((doc) => {
                    answeredQuestionsSet.add(doc.data().question);
                });
                newAnsweredMap[interview.id] = answeredQuestionsSet.size;
            }
            setAnsweredMap(newAnsweredMap);
        }
        fetchAnsweredCounts();
    }, [userId, interviews]);


    const handleInterviewDeleted = (deletedInterviewId) => {
        setInterviews((prev) => prev.filter((i) => i.id !== deletedInterviewId));
        setAnsweredMap((prev) => {
            const copy = { ...prev };
            delete copy[deletedInterviewId];
            return copy;
        });
        toast.success("Interview deleted successfully");
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 min-h-screen flex flex-col">

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
                <h1 className="text-3xl font-semibold text-gray-900 mb-4 sm:mb-0">Dashboard</h1>
                <Link to={"/generate/create"} className="inline-flex justify-center">
                    <Button size="sm" className="flex items-center gap-1">
                        <Plus className="w-4 h-4" /> Add New
                    </Button>
                </Link>
            </div>

            <Separator className="mb-8" />


            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, index) => (
                        <Skeleton
                            key={index}
                            className="h-28 sm:h-36 rounded-md shadow-md"
                        />
                    ))}
                </div>
            ) : interviews.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {interviews.map((interview) => {
                        const totalQuestions = interview.questions?.length || 0;
                        const answeredCount = answeredMap[interview.id] || 0;
                        const allAnswered = totalQuestions > 0 && answeredCount === totalQuestions;

                        return (
                            <InterviewPin
                                key={interview.id}
                                interview={interview}
                                allAnswered={allAnswered}
                                onDeleted={handleInterviewDeleted}
                            />
                        );
                    })}
                </div>
            ) : (
                <p className="text-center text-gray-500">No interviews found. Add a new one!</p>
            )}
        </div>
    );
};
