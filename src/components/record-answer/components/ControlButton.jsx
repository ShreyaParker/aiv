import { Button } from "@/components/ui/button";
import { CircleStop, Loader, Mic, RefreshCw, SaveIcon, Trash2, Video, VideoOff } from "lucide-react";

export const ControlButtons = ({
                                   isWebCam,
                                   setIsWebCam,
                                   isRecording,
                                   hasAnswer,
                                   recordUserAnswer,
                                   recordNewAnswer,
                                   saveUserAnswer,
                                   deleteAnswer,
                                   loading,
                                   aiResult,
                                   isAiGenerating,
                               }) => (
    <div className="flex justify-center gap-3 z-20">
        <Button variant="outline" onClick={() => setIsWebCam(!isWebCam)} size="sm" aria-label="Toggle webcam">
            {isWebCam ? <VideoOff /> : <Video />}
        </Button>

        {!hasAnswer ? (
            <>
                <Button variant="outline" onClick={recordUserAnswer} size="sm" aria-label={isRecording ? "Stop recording" : "Start recording"}>
                    {isRecording ? <CircleStop /> : <Mic />}
                </Button>
                <Button variant="outline" onClick={recordNewAnswer} size="sm" aria-label="Refresh answer">
                    <RefreshCw />
                </Button>
                <Button
                    variant="outline"
                    onClick={saveUserAnswer}
                    disabled={!aiResult || loading}
                    size="sm"
                    aria-label="Save answer"
                >
                    {isAiGenerating || loading ? <Loader className="animate-spin" /> : <SaveIcon />}
                </Button>
            </>
        ) : (
            <Button
                variant="outline"
                onClick={deleteAnswer}
                disabled={loading}
                size="sm"
                className="text-red-700 border-red-700 hover:text-red-900"
                aria-label="Delete answer"
            >
                <Trash2 />
            </Button>
        )}
    </div>
);
