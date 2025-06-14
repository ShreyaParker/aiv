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
import { CircleCheck, Star } from "lucide-react";
import { Card, CardDescription, CardTitle } from "@/components/ui/card.jsx";

export const Feedback = () => {
  const { interviewId } = useParams();
  const [interview, setInterview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [feedbacks, setFeedbacks] = useState([]);
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

  const feedbackBySection = useMemo(() => {
    if (!interview || !interview.sections || feedbacks.length === 0) return [];

    return interview.sections.map((section) => {
      const sectionFeedbacks = feedbacks.filter((fb) =>
          section.questions.some((q) => q.question === fb.question)
      );


      const anyNoPersonDetected = sectionFeedbacks.some(
          (fb) => fb.personDetectedDuringRecording === false
      );


      const suspiciousObjects = ["cell phone", "laptop"];
      const flaggedObjects = new Set();

      sectionFeedbacks.forEach((fb) => {
        (fb.objectDetected || []).forEach((obj) => {
          if (suspiciousObjects.includes(obj)) {
            flaggedObjects.add(obj);
          }
        });
      });

      return {
        ...section,
        feedbacks: sectionFeedbacks,
        personFlag: anyNoPersonDetected,
        suspiciousObjects: Array.from(flaggedObjects),
      };
    });
  }, [interview, feedbacks]);

  if (isLoading) {
    return <LoaderPage className="w-full h-[70vh]" />;
  }

  return (
      <div className="flex flex-col w-full gap-8 py-8 max-w-5xl mx-auto px-4">
        <header className="space-y-2">
          <h1 className="text-3xl font-extrabold text-gray-900">Congratulations!</h1>
          <p className="text-gray-600 max-w-xl">
            Your personalized feedback is now available. Dive in to see your strengths, areas for improvement, and tips to help you ace your next interview.
          </p>

          <p className="mt-4 text-lg text-gray-700">
            Your overall interview rating:{" "}
            <span className="text-emerald-600 font-semibold text-2xl">{overAllRating} / 10</span>
          </p>
        </header>

        {interview && (
            <InterviewPin
                interview={interview}
                feedbackBySection={feedbackBySection}
                onMockPage
            />
        )}

        <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">
          Interview Feedback by Section
        </h2>

        {feedbackBySection.length > 0 ? (
            <div className="space-y-10">
              {feedbackBySection.map((section) => (
                  <section key={section.type}>
                    <h3 className="text-xl font-bold mb-4">{section.type} Section</h3>

                    {(section.personFlag || section.suspiciousObjects.length > 0) && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded-md text-sm text-red-800">
                          <strong>Warning:</strong>
                          <ul className="list-disc list-inside mt-2 space-y-1">
                            {section.personFlag && (
                                <li>No person was detected during at least one answer. Make sure you're visible during the interview.</li>
                            )}
                            {section.suspiciousObjects.map((obj, i) => (
                                <li key={i}>{obj} was detected. Please avoid using external devices during recording.</li>
                            ))}
                          </ul>
                        </div>
                    )}

                    {section.feedbacks.length > 0 ? (
                        <Accordion type="single" collapsible className="space-y-6">
                          {section.feedbacks.map((feed) => (
                              <AccordionItem
                                  key={feed.id}
                                  value={feed.id}
                                  className="border rounded-lg shadow-md"
                              >
                                <AccordionTrigger className="px-5 py-3 flex items-center justify-between text-base rounded-t-lg transition-colors hover:no-underline">
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
                        <p className="text-gray-500 italic">No feedback available for this section.</p>
                    )}
                  </section>
              ))}
            </div>
        ) : (
            <p className="text-center text-gray-500 mt-12">No feedback available yet.</p>
        )}
      </div>
  );
};
