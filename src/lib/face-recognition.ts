import * as faceapi from 'face-api.js';

let modelsLoaded = false;

export async function loadFaceModels(): Promise<void> {
  if (modelsLoaded) return;
  const MODEL_URL = '/models';
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);
  modelsLoaded = true;
}

export async function detectFace(video: HTMLVideoElement): Promise<Float32Array | null> {
  const detection = await faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();
  return detection ? detection.descriptor : null;
}

export function compareFaces(descriptor1: Float32Array, descriptor2: Float32Array): number {
  return faceapi.euclideanDistance(descriptor1, descriptor2);
}

export const FACE_MATCH_THRESHOLD = 0.5;
