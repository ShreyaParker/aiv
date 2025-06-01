import WebCam from "react-webcam";
import {WebcamIcon} from "lucide-react";

export const WebcamBox = ({ webcamRef, canvasRef, isWebCam, setIsWebCam }) => (
    <div className="relative w-full h-[400px] md:w-96 border p-2 bg-gray-50 rounded-md overflow-hidden z-10">
        {isWebCam ? (
            <>
                <WebCam
                    ref={webcamRef}
                    onUserMedia={() => setIsWebCam(true)}
                    onUserMediaError={() => setIsWebCam(false)}
                    className="w-full h-full object-cover rounded-md"
                    videoConstraints={{ facingMode: "user" }}
                    audio={false}
                />
                <canvas
                    ref={canvasRef}
                    style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
                />
            </>
        ) : (
            <div className="w-full h-full flex items-center justify-center">
                <WebcamIcon className="w-24 h-24 text-muted-foreground" />
            </div>
        )}
    </div>
);
