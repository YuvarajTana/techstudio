import { fabric } from 'fabric';
import type {
  ChromaKeyConfig,
  DynamicMediaAssetPayload,
} from '../types/timeline';
import { masterTimelineManager } from './masterTimelineManager';

const TRANSPARENT_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
const MAX_BUFFER_EDGE = 1920;

type VideoFabricObject = fabric.Image & {
  getSrc: (filtered?: boolean) => string;
};

const objectValue = (object: fabric.Object, key: string) => (
  object.get(key as keyof fabric.Object) as unknown
);

const numberValue = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const createId = (prefix: string) => (
  window.crypto?.randomUUID
    ? `${prefix}-${window.crypto.randomUUID()}`
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
);

const parseHexColor = (color: string): [number, number, number] => {
  const normalized = color.replace('#', '').trim();
  const expanded = normalized.length === 3
    ? normalized.split('').map((value) => `${value}${value}`).join('')
    : normalized.padEnd(6, '0').slice(0, 6);
  return [
    parseInt(expanded.slice(0, 2), 16) / 255,
    parseInt(expanded.slice(2, 4), 16) / 255,
    parseInt(expanded.slice(4, 6), 16) / 255,
  ];
};

const waitForVideoMetadata = (video: HTMLVideoElement) => new Promise<void>((resolve, reject) => {
  if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
    resolve();
    return;
  }
  const timeout = window.setTimeout(() => {
    cleanup();
    reject(new Error('The video metadata could not be loaded. Check the URL and CORS policy.'));
  }, 12000);
  const cleanup = () => {
    window.clearTimeout(timeout);
    video.removeEventListener('loadedmetadata', handleLoaded);
    video.removeEventListener('error', handleError);
  };
  const handleLoaded = () => {
    cleanup();
    resolve();
  };
  const handleError = () => {
    cleanup();
    reject(new Error(video.error?.message || 'The video could not be decoded by this browser.'));
  };
  video.addEventListener('loadedmetadata', handleLoaded);
  video.addEventListener('error', handleError);
});

const createShader = (gl: WebGLRenderingContext, type: number, source: string) => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
};

class VideoFrameProcessor {
  readonly canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private webglCanvas: HTMLCanvasElement | null = null;
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private videoTexture: WebGLTexture | null = null;
  private maskTexture: WebGLTexture | null = null;
  private maskImage: HTMLImageElement | null = null;
  private maskReady = false;
  private chromaKey?: ChromaKeyConfig;

  constructor(
    width: number,
    height: number,
    chromaKey?: ChromaKeyConfig,
    maskUrl?: string,
  ) {
    this.chromaKey = chromaKey;
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    const context = this.canvas.getContext('2d', { alpha: true });
    if (!context) throw new Error('Canvas 2D rendering is unavailable.');
    this.context = context;
    if (chromaKey?.enabled || maskUrl) this.initializeWebGL(width, height);
    if (maskUrl) this.loadMask(maskUrl);
  }

  drawPoster(url?: string) {
    if (!url) return;
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      const scale = Math.max(this.canvas.width / image.width, this.canvas.height / image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.context.drawImage(
        image,
        (this.canvas.width - width) / 2,
        (this.canvas.height - height) / 2,
        width,
        height,
      );
    };
    image.src = url;
  }

  render(video: HTMLVideoElement) {
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return false;
    try {
      if (this.gl && this.program && this.videoTexture && this.maskTexture) {
        this.renderWebGL(video);
      } else {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.context.drawImage(video, 0, 0, this.canvas.width, this.canvas.height);
      }
      return true;
    } catch (error) {
      console.warn('[TECKSTUDIO] Video frame processing fell back to Canvas 2D:', error);
      this.destroyWebGL();
      this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.context.drawImage(video, 0, 0, this.canvas.width, this.canvas.height);
      return true;
    }
  }

  destroy() {
    this.destroyWebGL();
    this.maskImage = null;
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private initializeWebGL(width: number, height: number) {
    const webglCanvas = document.createElement('canvas');
    webglCanvas.width = width;
    webglCanvas.height = height;
    const gl = webglCanvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
    });
    if (!gl) return;
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      varying vec2 v_texCoord;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = a_texCoord;
      }
    `);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, `
      precision mediump float;
      uniform sampler2D u_video;
      uniform sampler2D u_mask;
      uniform vec3 u_keyColor;
      uniform float u_threshold;
      uniform float u_smoothing;
      uniform float u_useChroma;
      uniform float u_useMask;
      varying vec2 v_texCoord;
      void main() {
        vec2 textureCoordinate = vec2(v_texCoord.x, 1.0 - v_texCoord.y);
        vec4 color = texture2D(u_video, textureCoordinate);
        float chromaAlpha = smoothstep(
          u_threshold,
          u_threshold + max(u_smoothing, 0.001),
          distance(color.rgb, u_keyColor)
        );
        float maskAlpha = texture2D(u_mask, textureCoordinate).r;
        float alpha = color.a;
        if (u_useChroma > 0.5) alpha *= chromaAlpha;
        if (u_useMask > 0.5) alpha *= maskAlpha;
        gl_FragColor = vec4(color.rgb, alpha);
      }
    `);
    if (!vertexShader || !fragmentShader) return;
    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      return;
    }
    const positionBuffer = gl.createBuffer();
    const texCoordBuffer = gl.createBuffer();
    const videoTexture = gl.createTexture();
    const maskTexture = gl.createTexture();
    if (!positionBuffer || !texCoordBuffer || !videoTexture || !maskTexture) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 1, -1, -1, 1,
      -1, 1, 1, -1, 1, 1,
    ]), gl.STATIC_DRAW);
    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      0, 0, 1, 0, 0, 1,
      0, 1, 1, 0, 1, 1,
    ]), gl.STATIC_DRAW);
    const texCoordLocation = gl.getAttribLocation(program, 'a_texCoord');
    gl.enableVertexAttribArray(texCoordLocation);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);
    [videoTexture, maskTexture].forEach((texture) => {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    });
    gl.bindTexture(gl.TEXTURE_2D, maskTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([255, 255, 255, 255]),
    );
    this.webglCanvas = webglCanvas;
    this.gl = gl;
    this.program = program;
    this.videoTexture = videoTexture;
    this.maskTexture = maskTexture;
  }

  private loadMask(url: string) {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      this.maskReady = true;
    };
    image.onerror = () => {
      this.maskReady = false;
    };
    image.src = url;
    this.maskImage = image;
  }

  private renderWebGL(video: HTMLVideoElement) {
    const gl = this.gl;
    const program = this.program;
    const webglCanvas = this.webglCanvas;
    if (!gl || !program || !webglCanvas || !this.videoTexture || !this.maskTexture) return;
    gl.viewport(0, 0, webglCanvas.width, webglCanvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.videoTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
    gl.uniform1i(gl.getUniformLocation(program, 'u_video'), 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.maskTexture);
    if (this.maskReady && this.maskImage) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.maskImage);
    }
    gl.uniform1i(gl.getUniformLocation(program, 'u_mask'), 1);
    const keyColor = parseHexColor(this.chromaKey?.color || '#00ff00');
    gl.uniform3f(gl.getUniformLocation(program, 'u_keyColor'), ...keyColor);
    gl.uniform1f(gl.getUniformLocation(program, 'u_threshold'), this.chromaKey?.threshold ?? 0.22);
    gl.uniform1f(gl.getUniformLocation(program, 'u_smoothing'), this.chromaKey?.smoothing ?? 0.12);
    gl.uniform1f(gl.getUniformLocation(program, 'u_useChroma'), this.chromaKey?.enabled ? 1 : 0);
    gl.uniform1f(gl.getUniformLocation(program, 'u_useMask'), this.maskReady ? 1 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.context.drawImage(webglCanvas, 0, 0);
  }

  private destroyWebGL() {
    if (this.gl) {
      if (this.videoTexture) this.gl.deleteTexture(this.videoTexture);
      if (this.maskTexture) this.gl.deleteTexture(this.maskTexture);
      if (this.program) this.gl.deleteProgram(this.program);
    }
    this.webglCanvas = null;
    this.gl = null;
    this.program = null;
    this.videoTexture = null;
    this.maskTexture = null;
  }
}

const calculateBufferSize = (width: number, height: number) => {
  const safeWidth = Math.max(width, 1);
  const safeHeight = Math.max(height, 1);
  const scale = Math.min(MAX_BUFFER_EDGE / Math.max(safeWidth, safeHeight), 1);
  return {
    width: Math.max(Math.round(safeWidth * scale), 1),
    height: Math.max(Math.round(safeHeight * scale), 1),
  };
};

const bindVideoObject = async (
  object: fabric.Image,
  payload: DynamicMediaAssetPayload,
) => {
  if (!payload.sourceUrl) throw new Error('A video source URL is required.');
  const video = document.createElement('video');
  video.crossOrigin = 'anonymous';
  video.playsInline = true;
  video.preload = 'auto';
  video.loop = Boolean(payload.loop);
  video.muted = true;
  video.src = payload.sourceUrl;
  video.load();
  await waitForVideoMetadata(video);
  const sourceDuration = Math.max(payload.duration || video.duration || 10, 0.01);
  const startTime = Math.max(payload.startTime || 0, 0);
  const trimStart = Math.max(payload.trimStart || 0, 0);
  const trimEnd = Math.max(payload.trimEnd || sourceDuration, trimStart + 0.01);
  object.set({
    mediaDuration: sourceDuration,
    timelineStart: startTime,
    timelineEnd: payload.endTime ?? startTime + Math.min(sourceDuration, trimEnd - trimStart),
    timelineTrimStart: trimStart,
    timelineTrimEnd: trimEnd,
  } as Record<string, unknown>);
  const dimensions = calculateBufferSize(
    payload.width || video.videoWidth || object.width || 1280,
    payload.height || video.videoHeight || object.height || 720,
  );
  const processor = new VideoFrameProcessor(
    dimensions.width,
    dimensions.height,
    payload.chromaKey,
    payload.segmentationMaskUrl,
  );
  processor.drawPoster(payload.posterUrl);
  const existingWidth = object.width;
  const existingHeight = object.height;
  (object as unknown as { setElement: (element: HTMLCanvasElement) => void }).setElement(processor.canvas);
  if (existingWidth && existingHeight) object.set({ width: existingWidth, height: existingHeight });
  const serializableObject = object as VideoFabricObject;
  serializableObject.getSrc = () => payload.posterUrl || TRANSPARENT_PIXEL;
  object.setCoords();
  const isObjectUrl = payload.sourceUrl.startsWith('blob:');
  masterTimelineManager.registerVideo({
    object,
    video,
    renderFrame: () => processor.render(video),
    destroy: () => {
      video.pause();
      video.removeAttribute('src');
      video.load();
      processor.destroy();
      if (isObjectUrl) URL.revokeObjectURL(payload.sourceUrl as string);
    },
  });
  return object;
};

export const createCanvasVideo = async (
  canvas: fabric.Canvas,
  payload: DynamicMediaAssetPayload,
  point?: { x: number; y: number },
) => {
  if (!payload.sourceUrl) throw new Error('Choose a video file or enter a video URL.');
  const placeholder = document.createElement('canvas');
  placeholder.width = Math.max(payload.width || 1280, 1);
  placeholder.height = Math.max(payload.height || 720, 1);
  const startTime = Math.max(payload.startTime || 0, 0);
  const requestedDuration = Math.max(payload.duration || 0, 0);
  const object = new fabric.Image(placeholder, {
    left: point?.x ?? canvas.getWidth() / 2,
    top: point?.y ?? canvas.getHeight() / 2,
    originX: 'center',
    originY: 'center',
    name: payload.name || 'Timeline video',
    objectCaching: false,
    perPixelTargetFind: false,
  });
  const sourceDuration = requestedDuration || 10;
  const trimStart = Math.max(payload.trimStart || 0, 0);
  const trimEnd = Math.max(payload.trimEnd || sourceDuration, trimStart + 0.01);
  const timelineDuration = Math.min(sourceDuration, trimEnd - trimStart);
  object.set({
    id: payload.id || createId('video'),
    objectType: 'video',
    teckstudioObjectType: 'canvasVideo',
    elementKind: 'video',
    displayName: payload.name || 'Timeline video',
    videoSrc: payload.sourceUrl,
    videoPosterFrame: payload.posterUrl,
    videoMimeType: payload.mimeType,
    videoLoop: payload.loop ?? true,
    videoMuted: payload.muted ?? true,
    mediaKind: 'video',
    mediaDuration: sourceDuration,
    timelineStart: startTime,
    timelineEnd: payload.endTime ?? startTime + timelineDuration,
    timelineTrimStart: trimStart,
    timelineTrimEnd: trimEnd,
    timelineKeyframes: payload.keyframes || [],
    timelineBaseVisible: true,
    chromaKeyConfig: payload.chromaKey,
    segmentationMaskUrl: payload.segmentationMaskUrl,
    staticExportSupported: true,
    animatedExportSupported: true,
  } as Record<string, unknown>);
  await bindVideoObject(object, payload);
  masterTimelineManager.refreshDuration();
  const maxWidth = canvas.getWidth() * 0.65;
  const maxHeight = canvas.getHeight() * 0.65;
  object.scale(Math.min(maxWidth / Math.max(object.width || 1, 1), maxHeight / Math.max(object.height || 1, 1), 1));
  canvas.add(object);
  canvas.setActiveObject(object);
  canvas.requestRenderAll();
  return object;
};

export const rehydrateCanvasVideos = async (canvas: fabric.Canvas) => {
  const videoObjects = canvas.getObjects().filter((object) => (
    objectValue(object, 'teckstudioObjectType') === 'canvasVideo'
    && Boolean(objectValue(object, 'videoSrc'))
  )) as fabric.Image[];
  await Promise.all(videoObjects.map(async (object) => {
    try {
      const sourceUrl = String(objectValue(object, 'videoSrc') || '');
      if (!sourceUrl || sourceUrl.startsWith('blob:')) return;
      const savedEndTime = numberValue(objectValue(object, 'timelineEnd'), 0);
      const savedTrimEnd = numberValue(objectValue(object, 'timelineTrimEnd'), 0);
      await bindVideoObject(object, {
        type: 'video',
        sourceUrl,
        posterUrl: String(objectValue(object, 'videoPosterFrame') || '') || undefined,
        mimeType: String(objectValue(object, 'videoMimeType') || '') || undefined,
        duration: numberValue(objectValue(object, 'mediaDuration'), 0),
        startTime: numberValue(objectValue(object, 'timelineStart'), 0),
        endTime: savedEndTime > 0 ? savedEndTime : undefined,
        trimStart: numberValue(objectValue(object, 'timelineTrimStart'), 0),
        trimEnd: savedTrimEnd > 0 ? savedTrimEnd : undefined,
        loop: objectValue(object, 'videoLoop') !== false,
        muted: objectValue(object, 'videoMuted') !== false,
        keyframes: objectValue(object, 'timelineKeyframes') as DynamicMediaAssetPayload['keyframes'],
        chromaKey: objectValue(object, 'chromaKeyConfig') as ChromaKeyConfig | undefined,
        segmentationMaskUrl: String(objectValue(object, 'segmentationMaskUrl') || '') || undefined,
        width: object.width,
        height: object.height,
      });
    } catch (error) {
      console.warn('[TECKSTUDIO] Saved video could not be reconnected; poster frame remains visible:', error);
    }
  }));
  masterTimelineManager.refreshDuration();
};

export const insertDynamicMediaAsset = async (
  canvas: fabric.Canvas,
  payload: DynamicMediaAssetPayload,
  point?: { x: number; y: number },
) => {
  if (payload.type === 'video') return createCanvasVideo(canvas, payload, point);
  if (payload.type === 'image') {
    if (!payload.sourceUrl) throw new Error('An image source URL is required.');
    return new Promise<fabric.Image>((resolve, reject) => {
      fabric.Image.fromURL(payload.sourceUrl as string, (image) => {
        if (!image.width || !image.height) {
          reject(new Error('The generated image has no dimensions.'));
          return;
        }
        image.set({
          id: payload.id || createId('image'),
          left: point?.x ?? canvas.getWidth() / 2,
          top: point?.y ?? canvas.getHeight() / 2,
          originX: 'center',
          originY: 'center',
          name: payload.name || 'Generated image',
          sourceUrl: payload.sourceUrl,
          timelineStart: payload.startTime ?? 0,
          timelineEnd: payload.endTime,
          timelineKeyframes: payload.keyframes || [],
          timelineBaseVisible: true,
        } as Record<string, unknown>);
        image.scaleToWidth(Math.min(canvas.getWidth() * 0.65, image.width));
        canvas.add(image);
        canvas.setActiveObject(image);
        canvas.requestRenderAll();
        resolve(image);
      }, { crossOrigin: 'anonymous' });
    });
  }
  const text = new fabric.Textbox(payload.text || payload.name || 'Dynamic text', {
    id: payload.id || createId('text'),
    left: point?.x ?? canvas.getWidth() / 2,
    top: point?.y ?? canvas.getHeight() / 2,
    originX: 'center',
    originY: 'center',
    width: Math.min(canvas.getWidth() * 0.7, 640),
    fontFamily: 'Inter',
    fontSize: 48,
    fontWeight: 'bold',
    fill: '#ffffff',
    textAlign: 'center',
    name: payload.name || 'Dynamic text',
    timelineStart: payload.startTime ?? 0,
    timelineEnd: payload.endTime,
    timelineKeyframes: payload.keyframes || [],
    timelineBaseVisible: true,
  } as fabric.ITextboxOptions);
  canvas.add(text);
  canvas.setActiveObject(text);
  canvas.requestRenderAll();
  return text;
};
