import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { Camera, Loader2 } from 'lucide-react';

const MODEL_URL = '/models/face';
let modelsPromise = null;
const loadModels = () => {
  if (!modelsPromise) {
    modelsPromise = Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]).catch((e) => {
      modelsPromise = null;
      throw e;
    });
  }
  return modelsPromise;
};

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const eyeAspectRatio = (pts) =>
  (dist(pts[1], pts[5]) + dist(pts[2], pts[4])) / (2 * dist(pts[0], pts[3]));

/**
 * Webcam face capture.
 *  - mode "enroll": collects `samples` descriptors, then calls onComplete(descriptors[])
 *  - mode "verify": requires a blink (basic liveness) then calls onComplete([descriptor])
 * Camera is stopped on unmount / completion.
 */
const FaceCapture = ({ mode = 'enroll', samples = 5, onComplete, onError }) => {
  const videoRef = useRef(null);
  const [status, setStatus] = useState('Loading face models...');
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let stream;
    let cancelled = false;
    let timer;
    const collected = [];
    // Blink state (verify mode). Uses a per-user adaptive baseline instead of fixed
    // EAR thresholds, because the tiny landmark model gives low/noisy EAR values.
    const blink = { done: mode !== 'verify', baseline: 0, frames: 0, closed: false };
    let lastCapture = 0;

    const stop = () => {
      cancelled = true;
      clearTimeout(timer);
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };

    const detOpts = () => new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.4 });

    const tick = async () => {
      if (cancelled) return;
      const video = videoRef.current;
      let delay = 150;
      try {
        if (video && video.readyState >= 2) {
          if (!blink.done) {
            // ---- Phase 1: blink liveness. Landmarks only (no descriptor) so the loop is
            // fast enough (~20+ fps) to actually catch a ~150ms blink.
            delay = 0;
            const faces = await faceapi.detectAllFaces(video, detOpts()).withFaceLandmarks(true);
            if (faces.length === 0) {
              setStatus('No face detected — look at the camera');
              blink.frames = 0; blink.baseline = 0; blink.closed = false;
            } else if (faces.length > 1) {
              setStatus('Multiple faces detected — only you should be in view');
            } else if (faces[0].detection.box.width < video.videoWidth * 0.15) {
              setStatus('Move closer to the camera');
            } else {
              const pts = faces[0].landmarks.positions;
              const ear = (eyeAspectRatio(pts.slice(36, 42)) + eyeAspectRatio(pts.slice(42, 48))) / 2;
              blink.frames += 1;
              // baseline = slowly-adapting "eyes open" level (follows the max, decays gently)
              blink.baseline = blink.baseline === 0 ? ear : Math.max(ear, blink.baseline * 0.995);
              if (blink.frames >= 6) {
                if (!blink.closed && ear < blink.baseline * 0.78) blink.closed = true;
                else if (blink.closed && ear > blink.baseline * 0.9) blink.done = true;
              }
              setStatus(blink.done ? 'Verifying...' : 'Please blink once to prove you are live');
            }
          } else if (mode === 'verify') {
            // ---- Phase 2: after the blink, grab one clean descriptor.
            const results = await faceapi.detectAllFaces(video, detOpts()).withFaceLandmarks(true).withFaceDescriptors();
            if (results.length === 1) {
              stop();
              onComplete([Array.from(results[0].descriptor)]);
              return;
            }
            delay = 100;
          } else {
            const results = await faceapi.detectAllFaces(video, detOpts()).withFaceLandmarks(true).withFaceDescriptors();
            if (results.length === 0) setStatus('No face detected — look at the camera');
            else if (results.length > 1) setStatus('Multiple faces detected — only you should be in view');
            else if (results[0].detection.box.width < video.videoWidth * 0.2) setStatus('Move closer to the camera');
            else {
              const now = Date.now();
              if (now - lastCapture > 700) {
                lastCapture = now;
                collected.push(Array.from(results[0].descriptor));
                setProgress(collected.length);
                setStatus(`Hold still, slightly turn your head... (${collected.length}/${samples})`);
                if (collected.length >= samples) {
                  stop();
                  onComplete(collected);
                  return;
                }
              }
            }
          }
        }
      } catch (e) {
        // transient detection errors should not kill the loop
        console.error(e);
      }
      timer = setTimeout(tick, delay);
    };

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Camera is not available. Use https or localhost and a supported browser.');
        }
        await loadModels();
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' }, audio: false });
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setReady(true);
        setStatus('Look at the camera');
        tick();
      } catch (e) {
        const msg =
          e.name === 'NotAllowedError' ? 'Camera permission denied. Allow camera access and try again.'
          : e.name === 'NotFoundError' ? 'No camera found on this device.'
          : e.message || 'Could not start camera';
        setStatus(msg);
        onError?.(msg);
      }
    })();

    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full">
      <div className="relative rounded-xl overflow-hidden bg-slate-900 aspect-[4/3]">
        <video ref={videoRef} muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-300">
            <Loader2 className="animate-spin" size={28} />
          </div>
        )}
        {ready && <div className="absolute inset-6 border-2 border-white/40 rounded-full pointer-events-none" />}
      </div>
      <p className="text-sm text-slate-600 mt-3 flex items-center gap-2">
        <Camera size={14} /> {status}
      </p>
      {mode === 'enroll' && (
        <div className="h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
          <div className="h-full bg-primary-500 transition-all" style={{ width: `${(progress / samples) * 100}%` }} />
        </div>
      )}
    </div>
  );
};

export default FaceCapture;