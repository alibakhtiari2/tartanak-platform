"use client";

import { useEffect, useRef } from "react";

type NeuralNoiseProps = {
  color?: [number, number, number];
  opacity?: number;
  speed?: number;
  className?: string;
};

type NeuralUniforms = Record<string, WebGLUniformLocation | null>;

export function NeuralNoise({
  color = [0.66, 0.79, 0.34],
  opacity = 0.72,
  speed = 0.001,
  className = ""
}: NeuralNoiseProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const pointer = { x: 0, y: 0, tX: 0, tY: 0 };
    let animationFrame = 0;

    const gl =
      canvas.getContext("webgl", {
        alpha: true,
        antialias: false,
        depth: false,
        stencil: false
      }) ?? canvas.getContext("experimental-webgl");

    if (!gl || !(gl instanceof WebGLRenderingContext)) {
      return;
    }

    const vsSource = `
      precision mediump float;
      varying vec2 vUv;
      attribute vec2 a_position;

      void main() {
        vUv = 0.5 * (a_position + 1.0);
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    const fsSource = `
      precision mediump float;
      varying vec2 vUv;
      uniform float u_time;
      uniform float u_ratio;
      uniform vec2 u_pointer_position;
      uniform vec3 u_color;
      uniform float u_speed;

      vec2 rotate(vec2 uv, float th) {
        return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv;
      }

      float neuro_shape(vec2 uv, float t, float p) {
        vec2 sine_acc = vec2(0.0);
        vec2 res = vec2(0.0);
        float scale = 8.0;

        for (int j = 0; j < 15; j++) {
          uv = rotate(uv, 1.0);
          sine_acc = rotate(sine_acc, 1.0);
          vec2 layer = uv * scale + float(j) + sine_acc - t;
          sine_acc += sin(layer) + 2.4 * p;
          res += (0.5 + 0.5 * cos(layer)) / scale;
          scale *= 1.2;
        }

        return res.x + res.y;
      }

      void main() {
        vec2 uv = 0.5 * vUv;
        uv.x *= u_ratio;
        vec2 pointer = vUv - u_pointer_position;
        pointer.x *= u_ratio;
        float p = clamp(length(pointer), 0.0, 1.0);
        p = 0.5 * pow(1.0 - p, 2.0);
        float t = u_speed * u_time;
        vec3 col = vec3(0.0);
        float noise = neuro_shape(uv, t, p);
        noise = 1.2 * pow(noise, 3.0);
        noise += pow(noise, 10.0);
        noise = max(0.0, noise - 0.5);
        noise *= (1.0 - length(vUv - 0.5));
        col = u_color * noise;
        gl_FragColor = vec4(col, noise);
      }
    `;

    const createShader = (source: string, type: number) => {
      const shader = gl.createShader(type);

      if (!shader) {
        return null;
      }

      gl.shaderSource(shader, source);
      gl.compileShader(shader);

      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
      }

      return shader;
    };

    const vertexShader = createShader(vsSource, gl.VERTEX_SHADER);
    const fragmentShader = createShader(fsSource, gl.FRAGMENT_SHADER);

    if (!vertexShader || !fragmentShader) {
      return;
    }

    const program = gl.createProgram();

    if (!program) {
      return;
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      return;
    }

    const uniforms: NeuralUniforms = {};
    const uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);

    for (let i = 0; i < uniformCount; i += 1) {
      const activeUniform = gl.getActiveUniform(program, i);

      if (activeUniform) {
        uniforms[activeUniform.name] = gl.getUniformLocation(
          program,
          activeUniform.name
        );
      }
    }

    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const vertexBuffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    gl.useProgram(program);

    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.uniform3f(uniforms.u_color, color[0], color[1], color[2]);
    gl.uniform1f(uniforms.u_speed, speed);

    const resizeCanvas = () => {
      const devicePixelRatio = Math.min(window.devicePixelRatio, 2);
      canvas.width = Math.floor(window.innerWidth * devicePixelRatio);
      canvas.height = Math.floor(window.innerHeight * devicePixelRatio);
      gl.uniform1f(uniforms.u_ratio, canvas.width / canvas.height);
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const render = () => {
      const currentTime = performance.now();
      pointer.x += (pointer.tX - pointer.x) * 0.2;
      pointer.y += (pointer.tY - pointer.y) * 0.2;
      gl.uniform1f(uniforms.u_time, currentTime);
      gl.uniform2f(
        uniforms.u_pointer_position,
        pointer.x / window.innerWidth,
        1 - pointer.y / window.innerHeight
      );
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animationFrame = requestAnimationFrame(render);
    };

    const updateMousePosition = (x: number, y: number) => {
      pointer.tX = x;
      pointer.tY = y;
    };
    const pointermove = (event: PointerEvent) => {
      updateMousePosition(event.clientX, event.clientY);
    };
    const touchmove = (event: TouchEvent) => {
      if (event.targetTouches[0]) {
        updateMousePosition(
          event.targetTouches[0].clientX,
          event.targetTouches[0].clientY
        );
      }
    };
    const click = (event: MouseEvent) => {
      updateMousePosition(event.clientX, event.clientY);
    };

    resizeCanvas();
    render();
    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("pointermove", pointermove);
    window.addEventListener("touchmove", touchmove);
    window.addEventListener("click", click);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("pointermove", pointermove);
      window.removeEventListener("touchmove", touchmove);
      window.removeEventListener("click", click);
    };
  }, [color, speed]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 z-0 h-full w-full ${className}`}
      style={{ opacity }}
    />
  );
}
