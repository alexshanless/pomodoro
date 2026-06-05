import styled, { css, keyframes } from 'styled-components';

/*
 * Styled-components for the minimalist timer redesign (pompay Style Spec).
 * Tokens live in `t`; in-stage elements read them directly. The portaled
 * settings drawer / scrim use the same literals since they render outside
 * the timer subtree. The ring's rotation reuses --arc-rotation from App.css.
 */
const t = {
  bg: '#131a2a',
  bgSoft: '#1b2336',
  ink: '#eef1f8',
  soft: '#aab2c8',
  muted: '#6b7591',
  track: '#232c42',
  line: 'rgba(255, 255, 255, 0.07)',
  c1: '#38c6ff',
  c2: '#7b6bff',
  c3: '#d63bff',
};

const popIn = keyframes`
  from { opacity: 0; transform: translateY(-6px); }
  to { opacity: 1; transform: translateY(0); }
`;

const scrimIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const drawerIn = keyframes`
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
`;

const drawerInUp = keyframes`
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
`;

/* ---------- Toolbar ---------- */
export const Toolbar = styled.div`
  position: absolute;
  top: 24px;
  right: 28px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  z-index: 20;

  /* Mobile: collapse the right column into a centered top pill bar */
  @media (max-width: 560px) {
    top: max(18px, env(safe-area-inset-top));
    right: 50%;
    transform: translateX(50%);
    flex-direction: row;
    gap: 2px;
    padding: 5px;
    background: ${t.bgSoft};
    border: 1px solid ${t.line};
    border-radius: 999px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
  }
`;

export const Tool = styled.button`
  appearance: none;
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  border: none;
  background: transparent;
  color: ${t.muted};
  cursor: pointer;
  transition: color 0.2s ease, background 0.2s ease;

  &:hover,
  &[aria-pressed='true'] {
    color: ${t.ink};
    background: ${t.bgSoft};
  }

  svg {
    width: 19px;
    height: 19px;
    display: block;
  }

  @media (max-width: 560px) {
    width: 46px;
    height: 46px;
    border-radius: 999px;

    svg {
      width: 20px;
      height: 20px;
    }
  }
`;

/* ---------- Stats popover ---------- */
export const StatRow = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 9px 0;

  & + & {
    border-top: 1px solid rgba(255, 255, 255, 0.05);
  }

  span {
    font-size: 15px;
    font-weight: 500;
    color: ${t.muted};
  }

  b {
    font-size: 22px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
`;

export const PopoverLink = styled.button`
  appearance: none;
  margin-top: 16px;
  width: 100%;
  border: 1px solid ${t.line};
  background: transparent;
  color: ${t.soft};
  font-family: 'Fredoka', sans-serif;
  font-size: 13px;
  font-weight: 600;
  padding: 9px 14px;
  border-radius: 10px;
  cursor: pointer;
  transition: color 0.2s ease, border-color 0.2s ease;

  &:hover {
    color: ${t.ink};
    border-color: rgba(255, 255, 255, 0.2);
  }
`;

export const Popover = styled.div`
  position: absolute;
  top: 24px;
  right: 84px;
  width: 270px;
  background: ${t.bgSoft};
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 18px;
  padding: 20px;
  z-index: 19;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
  animation: ${popIn} 0.18s ease;

  h3 {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: ${t.muted};
    margin-bottom: 16px;
  }

  /* Mobile: popover spans the width under the top pill bar */
  @media (max-width: 560px) {
    top: calc(max(18px, env(safe-area-inset-top)) + 64px);
    right: 18px;
    left: 18px;
    width: auto;
  }
`;

/* ---------- Task header ---------- */
export const Task = styled.div`
  width: 100%;
  max-width: 540px;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;

  @media (max-width: 560px) {
    max-width: 100%;
  }
`;

export const TaskSetup = styled.div`
  width: 100%;
  position: relative;
`;

export const TaskInput = styled.input`
  width: 100%;
  background: transparent;
  border: none;
  outline: none;
  color: ${t.ink};
  font-family: inherit;
  font-size: 23px;
  font-weight: 500;
  text-align: center;
  padding: 6px 0;
  border-bottom: 1px solid transparent;
  transition: border-color 0.2s ease;

  &::placeholder {
    color: ${t.muted};
  }

  &:focus {
    border-bottom-color: rgba(255, 255, 255, 0.14);
  }

  @media (max-width: 560px) {
    font-size: 18px;
  }
`;

export const Suggestions = styled.div`
  position: absolute;
  top: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  width: min(360px, 100%);
  background: ${t.bgSoft};
  border: 1px solid ${t.line};
  border-radius: 12px;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.4);
  overflow: hidden;
  z-index: 25;
`;

export const Suggestion = styled.div`
  padding: 10px 14px;
  font-family: 'Fredoka', sans-serif;
  font-size: 14px;
  color: ${t.soft};
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.04);
    color: ${t.ink};
  }
`;

export const TaskSummary = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
`;

export const TaskTitle = styled.div`
  font-size: 23px;
  font-weight: 600;
  color: ${t.ink};
  text-align: center;

  @media (max-width: 560px) {
    font-size: 20px;
  }
`;

export const Chips = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
`;

export const Chip = styled.span`
  font-size: 12.5px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: ${t.muted};
  background: ${t.bgSoft};
  padding: 5px 13px;
  border-radius: 999px;

  ${(p) => p.$project && css`
    color: ${t.ink};
  `}

  ${(p) => p.$tag && css`
    &::before {
      content: '#';
      opacity: 0.5;
    }
  `}
`;

/* ---------- Mode tabs ---------- */
export const Modes = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px;
  background: ${t.bgSoft};
  border-radius: 999px;
  max-width: 100%;

  @media (max-width: 560px) {
    width: 100%;
    max-width: 360px;
  }
`;

export const Mode = styled.button`
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: ${t.muted};
  font-family: inherit;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.01em;
  line-height: 1;
  white-space: nowrap;
  height: 44px;
  padding: 0 22px;
  border-radius: 999px;
  cursor: pointer;
  box-sizing: border-box;
  transition: color 0.2s ease, background 0.2s ease;

  &:hover {
    color: ${t.ink};
  }

  &:disabled {
    cursor: default;
  }

  &[aria-selected='true'] {
    background: ${t.bg};
    color: ${t.ink};
    box-shadow: 0 1px 0 rgba(255, 255, 255, 0.04) inset;
  }

  @media (max-width: 560px) {
    flex: 1;
    height: auto;
    padding: 11px 8px;
    font-size: 13.5px;
  }
`;

/* ---------- Timer ring ---------- */
export const Ring = styled.div`
  position: relative;
  width: 420px;
  height: 420px;
  max-width: 80vw;
  flex-shrink: 0;
  display: grid;
  place-items: center;

  .CircularProgressbar-path {
    stroke-linecap: round;
  }

  .CircularProgressbar-trail {
    stroke: ${t.track};
    stroke-linecap: round;
  }

  @media (max-width: 560px) {
    width: min(76vw, 330px);
    height: min(76vw, 330px);
    overflow: hidden;
  }
`;

export const RingRotor = styled.div`
  width: 100%;
  height: 100%;
  transform: rotate(var(--arc-rotation));
  transform-origin: center;
`;

export const Readout = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  pointer-events: none;
`;

export const TimeText = styled.div`
  font-family: 'Fredoka', sans-serif;
  font-size: clamp(58px, 13vw, 92px);
  font-weight: 600;
  letter-spacing: 0.01em;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  color: ${t.ink};

  @media (max-width: 560px) {
    font-size: clamp(52px, 16vw, 70px);
  }
`;

export const ModeReadoutLabel = styled.div`
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: ${t.muted};
`;

/* ---------- Meta row ---------- */
export const Meta = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
  width: 100%;
  max-width: 540px;

  @media (max-width: 560px) {
    max-width: 360px;
    flex-direction: column;
  }
`;

export const Field = styled.select`
  background: ${t.bgSoft};
  border: 1px solid ${t.line};
  color: ${t.ink};
  font-family: 'Fredoka', sans-serif;
  font-size: 14px;
  font-weight: 500;
  padding: 11px 15px;
  border-radius: 12px;
  outline: none;
  transition: border-color 0.2s ease;
  appearance: none;
  padding-right: 36px;
  cursor: pointer;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%236b7591' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 13px center;

  &:focus {
    border-color: rgba(255, 255, 255, 0.18);
  }

  @media (max-width: 560px) {
    width: 100%;
  }
`;

export const Signup = styled.button`
  appearance: none;
  border: 1px solid ${t.line};
  background: ${t.bgSoft};
  color: ${t.soft};
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  padding: 11px 20px;
  border-radius: 999px;
  cursor: pointer;
  transition: color 0.2s ease, border-color 0.2s ease;

  &:hover {
    color: ${t.ink};
    border-color: rgba(255, 255, 255, 0.18);
  }
`;

export const Tags = styled.div`
  display: flex;
  align-items: center;

  @media (max-width: 560px) {
    width: 100%;
  }
`;

/* ---------- Controls ---------- */
export const Controls = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
  gap: 14px;

  @media (max-width: 560px) {
    gap: 12px;
  }
`;

const btnBase = css`
  appearance: none;
  font-family: 'Fredoka', sans-serif;
  cursor: pointer;
  white-space: nowrap;
  transition: transform 0.12s ease, opacity 0.2s ease, background 0.2s ease,
    color 0.2s ease;

  &:active {
    transform: translateY(1px);
  }

  svg {
    display: block;
  }
`;

export const PrimaryBtn = styled.button`
  ${btnBase};
  display: flex;
  align-items: center;
  gap: 11px;
  border: none;
  color: #0e1220;
  background: ${t.ink};
  font-size: 17px;
  font-weight: 600;
  padding: 16px 38px;
  border-radius: 999px;
  min-width: 168px;
  justify-content: center;

  svg {
    width: 17px;
    height: 17px;
  }

  @media (max-width: 560px) {
    min-width: 150px;
    padding: 15px 30px;
  }
`;

export const GhostBtn = styled.button`
  ${btnBase};
  display: grid;
  place-items: center;
  width: 54px;
  height: 54px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: transparent;
  color: ${t.muted};

  &:hover {
    color: ${t.ink};
    border-color: rgba(255, 255, 255, 0.22);
  }

  svg {
    width: 20px;
    height: 20px;
  }
`;

export const AccentBtn = styled.button`
  ${btnBase};
  display: flex;
  align-items: center;
  gap: 9px;
  border: none;
  color: #06222e;
  background: ${t.c1};
  font-size: 16px;
  font-weight: 600;
  padding: 15px 26px;
  border-radius: 999px;

  svg {
    width: 17px;
    height: 17px;
  }

  @media (max-width: 560px) {
    padding: 15px 22px;
  }
`;

/* ---------- Session dots ---------- */
export const Dots = styled.div`
  display: flex;
  gap: 10px;
  height: 9px;
  align-items: center;
`;

export const Dot = styled.span`
  width: 9px;
  height: 9px;
  border-radius: 999px;
  background: ${(p) => (p.$done ? t.c2 : t.track)};
  transition: background 0.3s ease;
`;

/* ---------- Root stage (defined last so it can reference children) ---------- */
export const Stage = styled.div`
  position: relative;
  /*
   * .main-content-new already reserves the area below the nav
   * (height: calc(100vh - 60px)) and adds 1rem padding. Fill that area and
   * bleed over the padding so the navy stage runs edge-to-edge under the nav.
   */
  margin: -1rem;
  width: calc(100% + 2rem);
  min-height: calc(100% + 2rem);
  background: ${t.bg};
  color: ${t.ink};
  font-family: 'Fredoka', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 28px;
  padding: 48px 24px;
  overflow: hidden;

  /* Zen mode: strip to ring + tabs + start + zen toggle */
  &[data-zen='true'] ${Tool}:not([data-zen-tool]),
  &[data-zen='true'] ${Task},
  &[data-zen='true'] ${Meta},
  &[data-zen='true'] ${Dots} {
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.4s ease;
  }

  button:focus-visible,
  input:focus-visible,
  select:focus-visible {
    outline: 2px solid ${t.c1};
    outline-offset: 2px;
  }

  /* Mobile: anchor content to the top, clear the top pill bar, and let the
     stage grow with content (parent .pomodoro-section-new scrolls via main). */
  @media (max-width: 560px) {
    justify-content: flex-start;
    flex-shrink: 0;
    min-height: calc(100vh - 60px);
    min-height: calc(100dvh - 60px);
    gap: 22px;
    padding: 92px 18px calc(40px + env(safe-area-inset-bottom));
  }
`;

/* =========================================================
   Settings drawer + scrim (portaled to body)
   ========================================================= */
export const OverlayRoot = styled.div`
  position: fixed;
  inset: 0;
  z-index: 2147483646;
`;

export const Scrim = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(8, 11, 20, 0.55);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  animation: ${scrimIn} 0.25s ease;

  @media (max-width: 560px) {
    backdrop-filter: blur(3px);
    -webkit-backdrop-filter: blur(3px);
  }
`;

export const DrawerPanel = styled.aside`
  position: absolute;
  top: 0;
  right: 0;
  height: 100vh;
  height: 100dvh;
  width: 388px;
  max-width: 88vw;
  z-index: 1;
  background: ${t.bgSoft};
  border-left: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: -30px 0 80px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  font-family: 'Fredoka', sans-serif;
  color: ${t.ink};
  animation: ${drawerIn} 0.32s cubic-bezier(0.4, 0, 0.2, 1);

  /* Mobile: becomes a bottom sheet with a grab handle */
  @media (max-width: 560px) {
    top: auto;
    right: 0;
    left: 0;
    bottom: 0;
    width: 100%;
    max-width: 100%;
    height: auto;
    max-height: 88vh;
    border-left: none;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 24px 24px 0 0;
    box-shadow: 0 -30px 80px rgba(0, 0, 0, 0.55);
    animation: ${drawerInUp} 0.34s cubic-bezier(0.4, 0, 0.2, 1);

    &::before {
      content: '';
      position: absolute;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      width: 40px;
      height: 4px;
      border-radius: 999px;
      background: ${t.track};
    }
  }
`;

export const DrawerHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28px 28px 18px;

  h2 {
    font-size: 21px;
    font-weight: 600;
    margin: 0;
  }

  @media (max-width: 560px) {
    padding: 24px 24px 16px;
  }
`;

export const DrawerClose = styled.button`
  appearance: none;
  width: 38px;
  height: 38px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: transparent;
  color: ${t.muted};
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: color 0.2s ease, border-color 0.2s ease;

  &:hover {
    color: ${t.ink};
    border-color: rgba(255, 255, 255, 0.25);
  }

  &:focus-visible {
    outline: 2px solid ${t.c1};
    outline-offset: 2px;
  }
`;

export const DrawerBody = styled.div`
  overflow-y: auto;
  padding: 4px 28px 36px;

  @media (max-width: 560px) {
    padding: 4px 24px calc(32px + env(safe-area-inset-bottom));
  }
`;

/* ---------- Settings form ---------- */
export const SetSection = styled.section`
  & + & {
    margin-top: 26px;
  }
`;

export const SetTitle = styled.div`
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: ${t.muted};
  margin: 0 0 4px;
`;

export const SetRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 15px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);

  &:last-child {
    border-bottom: none;
  }
`;

export const SetText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;

  span {
    font-size: 15px;
    font-weight: 500;
    color: ${t.ink};
  }

  small {
    font-size: 12.5px;
    color: ${t.muted};
    line-height: 1.4;
  }
`;

export const Stepper = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 10px;

  button {
    appearance: none;
    width: 26px;
    height: 26px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: transparent;
    color: ${t.ink};
    font-family: 'Fredoka', sans-serif;
    font-size: 16px;
    line-height: 1;
    cursor: pointer;
    display: grid;
    place-items: center;
    transition: border-color 0.2s ease;
  }

  button:hover {
    border-color: rgba(255, 255, 255, 0.3);
  }

  b {
    font-family: 'Fredoka', sans-serif;
    font-size: 15px;
    font-weight: 600;
    min-width: 34px;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }
`;

export const SwitchTrack = styled.span`
  position: absolute;
  inset: 0;
  background: ${t.track};
  border-radius: 999px;
  transition: background 0.2s ease;
`;

export const SwitchThumb = styled.span`
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  transition: transform 0.2s ease;
`;

export const Switch = styled.label`
  position: relative;
  display: inline-block;
  width: 44px;
  height: 26px;
  flex: none;
  cursor: pointer;

  input {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }

  input:checked ~ ${SwitchTrack} {
    background: ${t.c1};
  }

  input:checked ~ ${SwitchThumb} {
    transform: translateX(18px);
  }

  input:focus-visible ~ ${SwitchTrack} {
    outline: 2px solid ${t.c1};
    outline-offset: 2px;
  }
`;
