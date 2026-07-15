import React, { useId } from 'react';
import styled, { keyframes } from 'styled-components';

// PomPay brand mark: a Doric column (Pompeii — "pompay" = Pompeii + pay) whose
// three shafts double as a rising bar chart. Geometry from design_handoff_logo.

const GRADIENT_STOPS = (
  <>
    <stop offset='0' stopColor='#38c6ff' />
    <stop offset='0.55' stopColor='#7b6bff' />
    <stop offset='1' stopColor='#d63bff' />
  </>
);

const MarkRects = ({ gradientId, bar, elementClass }) => {
  const cls = elementClass || (() => undefined);
  return (
    <>
      <rect className={cls('base')} x='10' y='41' width='28' height='4' rx='2' fill={`url(#${gradientId})`} />
      <rect className={cls('shaft1')} x='16' y='19' width='4.6' height='20' rx='2.3' fill={bar} />
      <rect className={cls('shaft2')} x='21.7' y='19' width='4.6' height='20' rx='2.3' fill={bar} opacity='0.75' />
      <rect className={cls('shaft3')} x='27.4' y='19' width='4.6' height='20' rx='2.3' fill={bar} />
      <rect className={cls('neck')} x='13' y='13' width='22' height='4' rx='2' fill={bar} opacity='0.9' />
      <rect className={cls('cap')} x='10' y='6' width='28' height='5' rx='2.5' fill={`url(#${gradientId})`} />
    </>
  );
};

// One-shot build-in: same bottom-to-top beat as the loader, but each piece
// stays once it lands. Used for the nav mark on initial page load.
const introIn = keyframes`
  from { opacity: 0; transform: translateY(calc(var(--drop) * -1)); }
  to { opacity: 1; transform: none; }
`;

const IntroSvg = styled.svg`
  @media (prefers-reduced-motion: no-preference) {
    --drop: ${(p) => Math.max(2, Math.round(p.$size / 14))}px;

    .el {
      opacity: 0;
      animation: ${introIn} 0.4s ease-in-out forwards;
    }
    .el-base { animation-delay: 0s; }
    .el-shaft1 { animation-delay: 0.25s; }
    .el-shaft2 { animation-delay: 0.5s; }
    .el-shaft3 { animation-delay: 0.75s; }
    .el-neck { animation-delay: 1s; }
    .el-cap { animation-delay: 1.25s; }
  }
`;

export const PompayMark = ({ size = 28, onLight = false, intro = false, className }) => {
  const gradientId = `pompay-g-${useId().replace(/:/g, '')}`;
  const Svg = intro ? IntroSvg : 'svg';
  return (
    <Svg
      width={size}
      height={size}
      viewBox='0 0 48 48'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      className={className}
      aria-hidden='true'
      {...(intro ? { $size: size } : {})}
    >
      <defs>
        <linearGradient id={gradientId} x1='0' y1='0' x2='1' y2='1'>
          {GRADIENT_STOPS}
        </linearGradient>
      </defs>
      <MarkRects
        gradientId={gradientId}
        bar={onLight ? '#131a2a' : '#eef1f8'}
        elementClass={intro ? (name) => `el el-${name}` : undefined}
      />
    </Svg>
  );
};

// The mark assembles bottom-to-top (base → shafts → neck → capital), one
// element per 0.25s beat on a 1.8s loop, then fades out together.
const elin = keyframes`
  0%        { opacity: 0; transform: translateY(calc(var(--drop) * -1)); }
  8%, 78%   { opacity: 1; transform: none; }
  90%, 100% { opacity: 0; transform: none; }
`;

const LoaderRoot = styled.div`
  display: flex;
  flex-direction: ${(p) => (p.$inline ? 'row' : 'column')};
  align-items: center;
  justify-content: center;
  gap: ${(p) => (p.$inline ? '10px' : '14px')};

  .el {
    opacity: 1;
  }

  @media (prefers-reduced-motion: no-preference) {
    /* Drop distance scales with render size (-6px is tuned for ~84px) */
    --drop: ${(p) => Math.max(2, Math.round(p.$size / 14))}px;

    .el {
      opacity: 0;
      animation: ${elin} 1.8s linear infinite;
    }
    .el-base { animation-delay: 0s; }
    .el-shaft1 { animation-delay: 0.25s; }
    .el-shaft2 { animation-delay: 0.5s; }
    .el-shaft3 { animation-delay: 0.75s; }
    .el-neck { animation-delay: 1s; }
    .el-cap { animation-delay: 1.25s; }
  }
`;

const LoaderLabel = styled.span`
  font-size: 13px;
  color: #aab2c8;
`;

const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
`;

export const PompayLoader = ({ size = 84, label, onLight = false, className }) => {
  const gradientId = `pompay-lg-${useId().replace(/:/g, '')}`;
  return (
    <LoaderRoot role='status' $size={size} $inline={Boolean(label)} className={className}>
      <svg width={size} height={size} viewBox='0 0 48 48' fill='none' xmlns='http://www.w3.org/2000/svg' aria-hidden='true'>
        <defs>
          <linearGradient id={gradientId} x1='0' y1='0' x2='1' y2='1'>
            {GRADIENT_STOPS}
          </linearGradient>
        </defs>
        <MarkRects
          gradientId={gradientId}
          bar={onLight ? '#131a2a' : '#eef1f8'}
          elementClass={(name) => `el el-${name}`}
        />
      </svg>
      {label ? <LoaderLabel>{label}</LoaderLabel> : <VisuallyHidden>Loading</VisuallyHidden>}
    </LoaderRoot>
  );
};

export default PompayMark;
