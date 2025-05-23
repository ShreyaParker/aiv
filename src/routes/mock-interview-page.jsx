// MockInterviewPage.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { LoaderPage } from "./loader-page.jsx";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/config/firebase.config";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.jsx";
import { Lightbulb } from "lucide-react";
import QuestionSection from "@/components/question-section.jsx";
import { Button } from "@/components/ui/button";

export const MockInterviewPage = () => {
  const { interviewId } = useParams();
  const [interview, setInterview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState([]);
  const [isWebCam, setIsWebCam] = useState(false); // 👈 NEW

  const navigate = useNavigate();

  useEffect(() => {
    setIsLoading(true);
    const fetchInterview = async () => {
      if (interviewId) {
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
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchInterview();
  }, [interviewId]);

  const handleAnswerSaved = (questionText) => {
    setAnsweredQuestions((prev) => [...new Set([...prev, questionText])]);
  };

  const handleFeedbackRedirect = () => {
    navigate(`/generate/feedback/${interviewId}`);
  };

  if (isLoading) return <LoaderPage className="w-full h-[70vh]" />;
  if (!interviewId || !interview) {
    navigate("/generate", { replace: true });
    return null;
  }

  const allAnswered = answeredQuestions.length === interview?.questions?.length;

  return (
      <div className="flex flex-col w-full gap-8 py-5">
        <Alert className="bg-sky-100 border border-sky-200 p-4 rounded-lg flex items-start gap-3">
          <Lightbulb className="h-5 w-5 text-sky-600" />
          <div>
            <AlertTitle className="text-sky-800 font-semibold">Important Note</AlertTitle>
            <AlertDescription className="text-sm text-sky-700 mt-1 leading-relaxed">
              Press "Record Answer" to begin answering the question. Once you finish the interview,
              you'll receive feedback comparing your responses with the ideal answers.
              <br />
              <strong>Note:</strong>{" "}
              <span className="font-medium">Your video is never recorded.</span>
            </AlertDescription>
          </div>
        </Alert>

        {interview?.questions?.length > 0 && !allAnswered ? (
            <QuestionSection
                questions={interview.questions}
                answeredQuestions={answeredQuestions}
                onAnswerSaved={handleAnswerSaved}
                interviewId={interviewId}
                isWebCam={isWebCam} // 👈 NEW
                setIsWebCam={setIsWebCam} // 👈 NEW
            />
        ) : allAnswered && (
            <div className="mt-6 border rounded-md p-4 bg-emerald-50">
              <p className="text-sm text-emerald-700 font-medium">
                🎉 You've answered all questions! Ready to see how you did?
              </p>
              <div className="mt-3 flex justify-end">
                <Button onClick={handleFeedbackRedirect}>Check Your Feedback Now</Button>
              </div>
            </div>
        )}
      </div>
  );
};
