import { useState, useEffect, useCallback } from 'react';

export function useVoIP() {
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(80);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPushToTalk, setIsPushToTalk] = useState(false);
  const [isRadioCrackle, setIsRadioCrackle] = useState(true);

  useEffect(() => {
    if (isMuted) {
      setIsSpeaking(false);
      return;
    }

    let timeout: ReturnType<typeof setTimeout>;

    const tick = () => {
      setIsSpeaking((prev) => !prev);
      const delay = 3000 + Math.random() * 3000;
      timeout = setTimeout(tick, delay);
    };

    const delay = 3000 + Math.random() * 3000;
    timeout = setTimeout(tick, delay);

    return () => clearTimeout(timeout);
  }, [isMuted]);

  const toggleMute = useCallback(() => setIsMuted((prev) => !prev), []);

  return { isMuted, toggleMute, volume, setVolume, isSpeaking, isPushToTalk, setPushToTalk: setIsPushToTalk, isRadioCrackle, setRadioCrackle: setIsRadioCrackle };
}
