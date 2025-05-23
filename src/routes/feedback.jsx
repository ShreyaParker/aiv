import { db } from "@/config/firebase.config";
import { useAuth } from "@clerk/clerk-react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { LoaderPage } from "./loader-page.jsx";

import { InterviewPin } from "@/components/pin.jsx";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion.jsx";
import { cn } from "@/lib/utils";
import { CircleCheck, Star } from "lucide-react";
import { Card, CardDescription, CardTitle } from "@/components/ui/card.jsx";

export const Feedback = () => {
  const { interviewId } = useParams();
  const [interview, setInterview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [feedbacks, setFeedbacks] = useState([]);
  const [activeFeed, setActiveFeed] = useState("");
  const { userId } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!interviewId) {
      navigate("/generate", { replace: true });
      return;
    }

    const fetchInterview = async () => {
      try {
        const interviewDoc = await getDoc(doc(db, "interviews", interviewId));
        if (interviewDoc.exists()) {
          setInterview({
            id: interviewDoc.id,
            ...interviewDoc.data(),
          });
        }
      } catch (error) {
        console.log(error);
      }
    };

    const fetchFeedbacks = async () => {
      setIsLoading(true);
      try {
        const querySnapRef = query(
            collection(db, "userAnswers"),
            where("userId", "==", userId),
            where("mockIdRef", "==", interviewId)
        );

        const querySnap = await getDocs(querySnapRef);

        const interviewData = querySnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setFeedbacks(interviewData);
      } catch (error) {
        console.log(error);
        toast("Error", {
          description: "Something went wrong. Please try again later..",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchInterview();
    fetchFeedbacks();
  }, [interviewId, navigate, userId]);

  const overAllRating = useMemo(() => {
    if (feedbacks.length === 0) return "0.0";

    const totalRatings = feedbacks.reduce(
        (acc, feedback) => acc + feedback.rating,
        0
    );

    return (totalRatings / feedbacks.length).toFixed(1);
  }, [feedbacks]);

  if (isLoading) {
    return <LoaderPage className="w-full h-[70vh]" />;
  }

  return (
      <div className="flex flex-col w-full gap-8 py-8 max-w-5xl mx-auto px-4">

        <header className="space-y-2">
          <h1 className="text-3xl font-extrabold text-gray-900">
            Congratulations!
          </h1>
          <p className="text-gray-600 max-w-xl">
            Your personalized feedback is now available. Dive in to see your strengths, areas for improvement, and tips to help you ace your next interview.
          </p>

          <p className="mt-4 text-lg text-gray-700">
            Your overall interview rating:{" "}
            <span className="text-emerald-600 font-semibold text-2xl">
            {overAllRating} / 10
          </span>
          </p>
        </header>


        {interview && <InterviewPin interview={interview} onMockPage />}


        <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">
          Interview Feedback
        </h2>


        {feedbacks.length > 0 ? (
            <Accordion type="single" collapsible className="space-y-6">
              {feedbacks.map((feed) => (
                  <AccordionItem
                      key={feed.id}
                      value={feed.id}
                      className="border rounded-lg shadow-md"
                  >
                    <AccordionTrigger
                        onClick={() => setActiveFeed(feed.id)}
                        className={cn(
                            "px-5 py-3 flex items-center justify-between text-base rounded-t-lg transition-colors hover:no-underline",
                            activeFeed === feed.id
                                ? "bg-gradient-to-r from-purple-50 to-blue-50"
                                : "hover:bg-gray-50"
                        )}
                    >
                      <span>{feed.question}</span>
                    </AccordionTrigger>

                    <AccordionContent className="px-5 py-6 bg-white rounded-b-lg space-y-6 shadow-inner">
                      <div className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                        <Star className="text-yellow-400" />
                        Rating: {feed.rating}
                      </div>

                      <Card className="border-none bg-green-50 rounded-lg shadow-md p-5 space-y-3">
                        <CardTitle className="flex items-center text-lg text-green-700">
                          <CircleCheck className="mr-2" />
                          Expected Answer
                        </CardTitle>
                        <CardDescription className="font-medium text-gray-700">
                          {feed.correct_ans}
                        </CardDescription>
                      </Card>

                      <Card className="border-none bg-yellow-50 rounded-lg shadow-md p-5 space-y-3">
                        <CardTitle className="flex items-center text-lg text-yellow-700">
                          <CircleCheck className="mr-2" />
                          Your Answer
                        </CardTitle>
                        <CardDescription className="font-medium text-gray-700">
                          {feed.user_ans}
                        </CardDescription>
                      </Card>

                      <Card className="border-none bg-red-50 rounded-lg shadow-md p-5 space-y-3">
                        <CardTitle className="flex items-center text-lg text-red-700">
                          <CircleCheck className="mr-2" />
                          Feedback
                        </CardTitle>
                        <CardDescription className="font-medium text-gray-700">
                          {feed.feedback}
                        </CardDescription>
                      </Card>
                    </AccordionContent>
                  </AccordionItem>
              ))}
            </Accordion>
        ) : (
            <p className="text-center text-gray-500 mt-12">
              No feedback available yet.
            </p>
        )}
      </div>
  );
};
