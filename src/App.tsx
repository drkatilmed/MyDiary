import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePWAInstall, useOnlineStatus } from './usePWAInstall';

// ==========================================
// TYPES & DATA DEFINITIONS
// ==========================================
export interface JournalEntry {
  id: string;
  title: string;
  mood: string;
  category: string;
  content: string;
  photos: string[];
  audios: (string | null)[];
  timestamp: string; // ISO string
}

export type ThemeType = 'theme-pink' | 'theme-navy' | 'theme-black';

const DAILY_QUOTES = [
  "Hari baharu membawa kekuatan dan pemikiran baharu.",
  "Tuliskan impianmu dengan dakwat keberanian.",
  "Langkah kecil hari ini adalah permulaan kejayaan besar esok.",
  "Ketenangan minda adalah kemewahan hidup yang sebenar.",
  "Hargai setiap detik kecil yang mengisi harimu.",
  "Jadilah versi dirimu yang lebih baik daripada semalam.",
  "Masa depan dimiliki oleh mereka yang percaya pada keindahan impian mereka.",
  "Setiap cabaran adalah guru yang membentuk kematangan.",
  "Kesyukuran mengubah apa yang kita ada menjadi mencukupi.",
  "Fokus pada proses, nikmati perjalanannya.",
  "Jangan tunggu saat yang sempurna, jadikan saat ini bermakna.",
  "Kejayaan bermula dengan keberanian untuk mencuba.",
  "Tersenyumlah, harimu berharga untuk diisi dengan kebaikan.",
  "Disiplin adalah jambatan antara matlamat dan pencapaian.",
  "Kebaikan yang ikhlas sentiasa menemui jalan kembali.",
  "Perjalanan seribu batu bermula dengan langkah pertama.",
  "Rehatlah sebentar jika lelah, tetapi jangan pernah berputus asa.",
  "Setiap matahari terbit menjanjikan harapan yang segar.",
  "Kata-katamu membentuk realitimu; catatkan yang terbaik.",
  "Kekuatan sebenar terbit daripada ketenangan jiwa.",
  "Hiduplah pada masa kini dengan perancangan masa depan yang bijak.",
  "Kegagalan hanyalah peluang untuk bermula semula dengan lebih bijak.",
  "Keikhlasan dalam berkarya menghasilkan keabadian kenangan.",
  "Beri ruang untuk dirimu berkembang mengikut waktumu sendiri.",
  "Sentiasa ada sesuatu yang indah untuk disyukuri hari ini.",
  "Cipta peluang di mana orang lain hanya melihat halangan.",
  "Hargai orang di sekelilingmu, kenangan bersama mereka tidak ternilai.",
  "Ketabahan hari ini adalah mahkota kemenangan esok.",
  "Jadikan setiap helai jurnal ini saksi perjuangan hidupmu.",
  "Percayalah pada potensi luar biasa yang ada dalam dirimu.",
  "Tutup bulan ini dengan kesyukuran dan sambut masa depan dengan harapan."
];

const HAPPY_EMOJIS = ['😄', '🥳', '✨', '💃', '🌟', '🥰', '🎈', '🤩', '🌸', '💖'];

const PRAYER_KEYS = [
  { key: 'Fajr', label: 'Subuh' },
  { key: 'Sunrise', label: 'Syuruk' },
  { key: 'Dhuhr', label: 'Zohor' },
  { key: 'Asr', label: 'Asar' },
  { key: 'Maghrib', label: 'Maghrib' },
  { key: 'Isha', label: 'Isyak' }
];

function formatToDateTimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function compressImage(base64Str: string, maxSide: number, quality: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > maxSide) {
          height = Math.round((height * maxSide) / width);
          width = maxSide;
        }
      } else {
        if (height > maxSide) {
          width = Math.round((width * maxSide) / height);
          height = maxSide;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } else {
        resolve(base64Str);
      }
    };
    img.onerror = () => resolve(base64Str);
    img.src = base64Str;
  });
}

export default function App() {
  // ------------------------------------------
  // THEME MANAGEMENT
  // ------------------------------------------
  const [theme, setThemeState] = useState<ThemeType>(() => {
    try {
      return (localStorage.getItem('mydiary_theme') as ThemeType) || 'theme-pink';
    } catch {
      return 'theme-pink';
    }
  });
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);

  useEffect(() => {
    document.body.classList.remove('theme-pink', 'theme-navy', 'theme-black');
    document.body.classList.add(theme);
    try {
      localStorage.setItem('mydiary_theme', theme);
    } catch {}
  }, [theme]);

  // ------------------------------------------
  // TOAST SYSTEM
  // ------------------------------------------
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  }, []);

  // ------------------------------------------
  // PERSISTED ENTRIES
  // ------------------------------------------
  const [entries, setEntries] = useState<JournalEntry[]>(() => {
    try {
      const saved = localStorage.getItem('mydiary_entries');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Error loading entries:', e);
    }
    return [];
  });

  const saveEntries = (newEntries: JournalEntry[]) => {
    setEntries(newEntries);
    try {
      localStorage.setItem('mydiary_entries', JSON.stringify(newEntries));
    } catch {
      showToast('Storan pelayar penuh! Sila kurangkan foto atau fail audio.');
    }
  };

  // ------------------------------------------
  // LIVE CLOCK
  // ------------------------------------------
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dayNamesMs = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'];
  const monthNamesShortMs = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'];

  // ------------------------------------------
  // PRAYER TIMES (WAKTU SOLAT JAKIM MALAYSIA)
  // ------------------------------------------
  const [prayerData, setPrayerData] = useState<{
    name: string;
    time: string;
    countdown: string;
    locationLabel: string;
  }>({
    name: 'Solat...',
    time: '--:--',
    countdown: 'Mengesan lokasi...',
    locationLabel: 'Lokasi'
  });
  const prayerTimingsRef = useRef<Record<string, string> | null>(null);

  const parsePrayerTimeToDate = useCallback((timeStr: string) => {
    const cleanTime = String(timeStr).split(' ')[0];
    const [h, m] = cleanTime.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  }, []);

  const updateNextPrayer = useCallback((locationLabel: string) => {
    const timings = prayerTimingsRef.current;
    if (!timings) return;

    const now = new Date();
    let upcomingPrayer: { key: string; label: string } | null = null;
    let upcomingDate: Date | null = null;

    for (const p of PRAYER_KEYS) {
      if (timings[p.key]) {
        const pDate = parsePrayerTimeToDate(timings[p.key]);
        if (pDate > now) {
          upcomingPrayer = p;
          upcomingDate = pDate;
          break;
        }
      }
    }

    if (!upcomingPrayer || !upcomingDate) {
      upcomingPrayer = PRAYER_KEYS[0];
      upcomingDate = parsePrayerTimeToDate(timings.Fajr || '05:48');
      upcomingDate.setDate(upcomingDate.getDate() + 1);
    }

    const cleanClockTime = (timings[upcomingPrayer.key] || '--:--').split(' ')[0];
    const diffMs = upcomingDate.getTime() - now.getTime();
    const diffMinsTotal = Math.max(1, Math.floor(diffMs / 60000));
    const diffHours = Math.floor(diffMinsTotal / 60);
    const diffMins = diffMinsTotal % 60;

    let countdownStr = '';
    if (diffHours > 0) {
      countdownStr = `${diffHours}j ${diffMins}m lagi (${locationLabel})`;
    } else {
      countdownStr = `${diffMins} min lagi (${locationLabel})`;
    }

    setPrayerData({
      name: upcomingPrayer.label,
      time: cleanClockTime,
      countdown: countdownStr,
      locationLabel
    });
  }, [parsePrayerTimeToDate]);

  const fetchPrayerTimes = useCallback(async (lat: number, lng: number, label: string) => {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const res = await fetch(`https://api.aladhan.com/v1/timings/${timestamp}?latitude=${lat}&longitude=${lng}&method=17`);
      if (!res.ok) throw new Error('API solat gagal');
      const data = await res.json();
      if (data?.data?.timings) {
        prayerTimingsRef.current = data.data.timings;
        updateNextPrayer(label);
      } else {
        throw new Error('Data tidak sah');
      }
    } catch {
      // Fallback anggaran
      prayerTimingsRef.current = {
        Fajr: "05:48",
        Sunrise: "07:00",
        Dhuhr: "13:08",
        Asr: "16:25",
        Maghrib: "19:10",
        Isha: "20:20"
      };
      updateNextPrayer(label + ' • anggaran');
    }
  }, [updateNextPrayer]);

  const detectLocationAndPrayers = useCallback(() => {
    if (!navigator.geolocation) {
      fetchPrayerTimes(3.1390, 101.6869, 'K.Lumpur');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        fetchPrayerTimes(pos.coords.latitude, pos.coords.longitude, 'Lokasi Anda');
      },
      () => {
        fetchPrayerTimes(3.1390, 101.6869, 'K.Lumpur (Lalai)');
      },
      { timeout: 8000, enableHighAccuracy: false }
    );
  }, [fetchPrayerTimes]);

  useEffect(() => {
    detectLocationAndPrayers();
    const interval = setInterval(() => {
      if (prayerTimingsRef.current) {
        updateNextPrayer(prayerData.locationLabel);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [detectLocationAndPrayers, updateNextPrayer, prayerData.locationLabel]);

  // ------------------------------------------
  // GOLDEN DUST CANVAS ANIMATION
  // ------------------------------------------
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const particles: Array<{
      x: number;
      y: number;
      size: number;
      speedY: number;
      speedX: number;
      opacity: number;
      pulse: number;
    }> = [];

    const particleCount = 45;
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2.2 + 0.8,
        speedY: Math.random() * -0.4 - 0.15,
        speedX: (Math.random() - 0.5) * 0.3,
        opacity: Math.random() * 0.7 + 0.2,
        pulse: Math.random() * 0.02
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      const t = Date.now() * 0.002;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.y += p.speedY;
        p.x += p.speedX;
        p.opacity += Math.sin(t) * p.pulse;

        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 215, 0, ${Math.max(0.1, Math.min(0.85, p.opacity))})`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(255, 215, 0, 0.7)';
        ctx.fill();
      }
      animId = requestAnimationFrame(render);
    };

    render();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // ------------------------------------------
  // MOTIVATION QUOTES
  // ------------------------------------------
  const dayOfMonth = currentTime.getDate();
  const currentQuote = DAILY_QUOTES[(dayOfMonth - 1) % DAILY_QUOTES.length];

  // ------------------------------------------
  // CALENDAR
  // ------------------------------------------
  const [calendarCursor, setCalendarCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [filteredDateKey, setFilteredDateKey] = useState<string | null>(null);

  const calYear = calendarCursor.getFullYear();
  const calMonth = calendarCursor.getMonth();
  const monthNamesMs = [
    'Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun',
    'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'
  ];

  const firstDayOfMonthIndex = new Date(calYear, calMonth, 1).getDay();
  const daysInCurrentMonth = new Date(calYear, calMonth + 1, 0).getDate();

  // ------------------------------------------
  // FORM / EDITOR STATE
  // ------------------------------------------
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [customDateTime, setCustomDateTime] = useState<string>(() => formatToDateTimeLocal(new Date()));
  const [entryTitle, setEntryTitle] = useState('');
  const [entryMood, setEntryMood] = useState('🌸 Tenang & Bahagia');
  const [entryCategory, setEntryCategory] = useState('Catatan Harian');
  const [entryContent, setEntryContent] = useState('');

  // Photos: max 10
  const [attachedPhotos, setAttachedPhotos] = useState<string[]>([]);
  const [photoCursorIndex, setPhotoCursorIndex] = useState(0);

  // Audios: 3 slots
  const [attachedAudios, setAttachedAudios] = useState<(string | null)[]>([null, null, null]);
  const [activeAudioSlot, setActiveAudioSlot] = useState<number>(0);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check future date
  const isSelectedDateFuture = new Date(customDateTime).getTime() > Date.now();

  const formattedHeaderDate = (() => {
    const d = new Date(customDateTime);
    if (isNaN(d.getTime())) return 'Tarikh';
    const str = d.toLocaleDateString('ms-MY', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    return isSelectedDateFuture ? `${str} (Rancangan Hadapan)` : str;
  })();

  // Reset form
  const resetForm = useCallback(() => {
    stopRecording();
    setEntryTitle('');
    setEntryMood('🌸 Tenang & Bahagia');
    setEntryCategory('Catatan Harian');
    setEntryContent('');
    setAttachedPhotos([]);
    setPhotoCursorIndex(0);
    setAttachedAudios([null, null, null]);
    setActiveAudioSlot(0);
    setCustomDateTime(formatToDateTimeLocal(new Date()));
    setEditingEntryId(null);
  }, []);

  // ------------------------------------------
  // CAMERA VIEWFINDER (1:1) MODAL
  // ------------------------------------------
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraStatusText, setCameraStatusText] = useState('Menyambung lensa kamera...');
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  const stopCameraStream = useCallback(() => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
    }
    setIsCameraModalOpen(false);
  }, []);

  const startCameraStream = useCallback(async (facing: 'environment' | 'user') => {
    try {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((t) => t.stop());
        cameraStreamRef.current = null;
      }
      setCameraStatusText('Menyambung lensa kamera...');

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('MediaDevices tidak disokong pada pelayar ini.');
      }

      const constraintsList = [
        { video: { facingMode: { ideal: facing }, width: { ideal: 640 }, height: { ideal: 640 } }, audio: false },
        { video: { facingMode: facing }, audio: false },
        { video: true, audio: false }
      ];

      let stream: MediaStream | null = null;
      let lastErr: unknown = null;
      for (const c of constraintsList) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(c);
          if (stream) break;
        } catch (err) {
          lastErr = err;
        }
      }

      if (!stream) throw lastErr || new Error('Akses kamera disekat.');

      cameraStreamRef.current = stream;
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
        cameraVideoRef.current.muted = true;
        await cameraVideoRef.current.play();
      }
      setCameraStatusText(facing === 'environment' ? 'Kamera Belakang Aktif' : 'Kamera Depan Aktif');
    } catch (err: unknown) {
      const e = err as { name?: string; message?: string };
      let reason = 'Lensa kamera tidak dapat dibuka.';
      if (!window.isSecureContext) {
        reason = 'Kamera memerlukan konteks HTTPS atau localhost.';
      } else if (e?.name === 'NotAllowedError') {
        reason = 'Kebenaran kamera ditolak. Benarkan kamera di tetapan pelayar anda.';
      } else if (e?.name === 'NotFoundError') {
        reason = 'Tiada kamera dikesan pada peranti ini.';
      }
      setCameraStatusText(reason);
    }
  }, []);

  const openCameraModal = () => {
    if (attachedPhotos.length >= 10) {
      showToast('Maksimum 10 keping foto dicapai.');
      return;
    }
    setIsCameraModalOpen(true);
    startCameraStream(cameraFacingMode);
  };

  const flipCamera = () => {
    const nextMode = cameraFacingMode === 'environment' ? 'user' : 'environment';
    setCameraFacingMode(nextMode);
    startCameraStream(nextMode);
  };

  const takePhotoFromViewfinder = () => {
    const video = cameraVideoRef.current;
    if (!video || !video.srcObject) {
      showToast('Kamera belum bersedia.');
      return;
    }
    const vWidth = video.videoWidth || 640;
    const vHeight = video.videoHeight || 480;
    const squareSize = Math.min(vWidth, vHeight);
    const startX = (vWidth - squareSize) / 2;
    const startY = (vHeight - squareSize) / 2;

    const canvas = document.createElement('canvas');
    canvas.width = squareSize;
    canvas.height = squareSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, startX, startY, squareSize, squareSize, 0, 0, squareSize, squareSize);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);

    setAttachedPhotos((prev) => {
      const updated = [...prev, dataUrl];
      setPhotoCursorIndex(updated.length - 1);
      return updated;
    });
    stopCameraStream();
    showToast('Foto berjaya dirakam!');
  };

  // Direct file inputs
  const fileGalleryInputRef = useRef<HTMLInputElement | null>(null);
  const fileCameraInputRef = useRef<HTMLInputElement | null>(null);

  const handlePhotoFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remaining = 10 - attachedPhotos.length;
    if (remaining <= 0) {
      showToast('Maksimum 10 keping foto sahaja dibenarkan!');
      return;
    }

    const filesToTake = Array.from(files).slice(0, remaining);
    if (files.length > remaining) {
      showToast(`Hanya ${remaining} foto dimuatkan (had 10).`);
    }

    const promises = filesToTake.map((file) => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const raw = e.target?.result as string;
          const compressed = await compressImage(raw, 800, 0.85);
          resolve(compressed);
        };
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      });
    });

    const results = await Promise.all(promises);
    const validResults = results.filter((r) => r.length > 0);

    setAttachedPhotos((prev) => {
      const combined = [...prev, ...validResults];
      setPhotoCursorIndex(combined.length - 1);
      return combined;
    });

    showToast(`${validResults.length} foto berjaya dimasukkan!`);
  };

  // ------------------------------------------
  // AUDIO RECORDING LOGIC
  // ------------------------------------------
  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((t) => t.stop());
      audioStreamRef.current = null;
    }
    if (recordIntervalRef.current) {
      clearInterval(recordIntervalRef.current);
      recordIntervalRef.current = null;
    }
    setIsRecording(false);
  }

  const toggleRecording = async () => {
    if (isRecording) {
      stopRecording();
      return;
    }

    setRecordingError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
        throw new Error('Pelayar ini tidak menyokong rakaman audio.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      const candidates = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/aac', 'audio/ogg'];
      let selectedMime = '';
      for (const t of candidates) {
        if (MediaRecorder.isTypeSupported?.(t)) {
          selectedMime = t;
          break;
        }
      }

      const recorder = selectedMime ? new MediaRecorder(stream, { mimeType: selectedMime }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      const targetSlot = activeAudioSlot;
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const reader = new FileReader();
        reader.onload = (e) => {
          const res = e.target?.result as string;
          setAttachedAudios((prev) => {
            const next = [...prev];
            next[targetSlot] = res;
            return next;
          });
          showToast(`Audio Slot ${targetSlot + 1} berjaya disimpan!`);
        };
        reader.readAsDataURL(blob);

        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach((t) => t.stop());
          audioStreamRef.current = null;
        }
      };

      recorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);
      recordIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: unknown) {
      const e = err as { name?: string; message?: string };
      let reason = 'Rakaman gagal dimulakan.';
      if (!window.isSecureContext) {
        reason = 'Mikrofon memerlukan konteks selamat HTTPS atau localhost.';
      } else if (e?.name === 'NotAllowedError') {
        reason = 'Akses mikrofon disekat. Sila benarkan mikrofon dalam tetapan pelayar anda.';
      } else if (e?.name === 'NotFoundError') {
        reason = 'Tiada mikrofon dikesan pada peranti ini.';
      } else if (e?.message) {
        reason = e.message;
      }
      setRecordingError(reason);
      showToast(reason);
      stopRecording();
    }
  };

  const deleteCurrentAudioSlot = () => {
    setAttachedAudios((prev) => {
      const next = [...prev];
      next[activeAudioSlot] = null;
      return next;
    });
    showToast(`Audio Slot ${activeAudioSlot + 1} dipadam.`);
  };

  // ------------------------------------------
  // GOOGLE CALENDAR EXPORT
  // ------------------------------------------
  const buildGoogleCalendarLink = (entry: {
    title: string;
    timestamp: string;
    category: string;
    mood: string;
    content: string;
  }) => {
    const startDate = new Date(entry.timestamp);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

    const formatGCal = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, '');
    const datesParam = `${formatGCal(startDate)}/${formatGCal(endDate)}`;
    const titleText = `[MyDiary] ${entry.title}`;
    const isFuture = startDate.getTime() > Date.now();
    const detailsText = `Status: ${isFuture ? 'Perancangan Masa Depan' : 'Catatan Jurnal'}\nKategori: ${entry.category}\nSuasana: ${entry.mood}\n\nNota:\n${entry.content}`;

    const baseUrl = 'https://calendar.google.com/calendar/render';
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: titleText,
      dates: datesParam,
      details: detailsText
    });

    return `${baseUrl}?${params.toString()}`;
  };

  // ------------------------------------------
  // SAVE / UPDATE ENTRY
  // ------------------------------------------
  const handleSaveEntry = (openGCal = false) => {
    const cleanTitle = entryTitle.trim();
    const cleanContent = entryContent.trim();
    if (!cleanTitle || !cleanContent) {
      showToast('Sila isikan tajuk dan kandungan catatan!');
      return;
    }

    const targetDate = new Date(customDateTime);
    const timestamp = isNaN(targetDate.getTime()) ? new Date().toISOString() : targetDate.toISOString();

    const entryToSave: JournalEntry = {
      id: editingEntryId || `entry_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      title: cleanTitle,
      mood: entryMood,
      category: entryCategory,
      content: cleanContent,
      photos: [...attachedPhotos],
      audios: [...attachedAudios],
      timestamp
    };

    let updatedEntries: JournalEntry[];
    if (editingEntryId) {
      updatedEntries = entries.map((e) => (e.id === editingEntryId ? entryToSave : e));
      showToast('Catatan berjaya dikemas kini!');
    } else {
      updatedEntries = [entryToSave, ...entries];
      const isFuture = targetDate.getTime() > Date.now();
      showToast(isFuture ? 'Perancangan masa depan berjaya disimpan!' : 'Catatan berjaya disimpan ke arkib!');
    }

    saveEntries(updatedEntries);

    if (openGCal) {
      const gcalUrl = buildGoogleCalendarLink(entryToSave);
      window.open(gcalUrl, '_blank');
      showToast('Disimpan & dialihkan ke Google Calendar!');
    }

    resetForm();
    setIsArchiveOpen(true);
  };

  // Start edit
  const startEditEntry = (entry: JournalEntry) => {
    stopRecording();
    setEditingEntryId(entry.id);
    setEntryTitle(entry.title || '');
    setEntryMood(entry.mood || '🌸 Tenang & Bahagia');
    setEntryCategory(entry.category || 'Catatan Harian');
    setEntryContent(entry.content || '');
    setCustomDateTime(formatToDateTimeLocal(new Date(entry.timestamp)));
    setAttachedPhotos(entry.photos ? [...entry.photos] : []);
    setPhotoCursorIndex(0);
    setAttachedAudios(
      entry.audios && Array.isArray(entry.audios)
        ? [entry.audios[0] || null, entry.audios[1] || null, entry.audios[2] || null]
        : [null, null, null]
    );
    setActiveAudioSlot(0);
    setIsArchiveOpen(false);

    const editorEl = document.getElementById('editorPanelContainer');
    if (editorEl) {
      editorEl.scrollIntoView({ behavior: 'smooth' });
    }
    showToast('Catatan dimuatkan untuk disunting!');
  };

  const deleteEntry = (id: string) => {
    if (!window.confirm('Padam catatan ini secara kekal?')) return;
    const next = entries.filter((e) => e.id !== id);
    saveEntries(next);
    if (editingEntryId === id) resetForm();
    showToast('Catatan dipadam daripada arkib.');
  };

  // PWA / APK Install & Connectivity
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const isOnline = useOnlineStatus();
  const [isApkModalOpen, setIsApkModalOpen] = useState(false);

  // ------------------------------------------
  // DRAWER, MODALS & BACK NAVIGATION
  // ------------------------------------------
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [archiveSearch, setArchiveSearch] = useState('');
  const [isDonateOpen, setIsDonateOpen] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [joyMascotEmoji, setJoyMascotEmoji] = useState('😄');

  // Stats
  const totalEntries = entries.length;
  const totalPhotos = entries.reduce((acc, curr) => acc + (curr.photos?.length || 0), 0);
  const totalAudios = entries.reduce((acc, curr) => acc + (curr.audios?.filter(Boolean).length || 0), 0);
  const totalFuture = entries.filter((e) => new Date(e.timestamp).getTime() > Date.now()).length;

  // Filtered entries for archive
  const filteredEntries = entries.filter((e) => {
    const matchesSearch =
      archiveSearch.trim() === '' ||
      e.title.toLowerCase().includes(archiveSearch.toLowerCase()) ||
      e.content.toLowerCase().includes(archiveSearch.toLowerCase());

    const matchesDate = !filteredDateKey || toDateKey(new Date(e.timestamp)) === filteredDateKey;

    return matchesSearch && matchesDate;
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Mascot click
  const cycleMascot = () => {
    const next = HAPPY_EMOJIS[Math.floor(Math.random() * HAPPY_EMOJIS.length)];
    setJoyMascotEmoji(next);
    showToast(`Keep smiling & stay happy! ${next}`);
  };

  // Back button guard (keeps mobile back button inside the app)
  useEffect(() => {
    try {
      history.replaceState({ page: 'home' }, '', location.href);
      history.pushState({ page: 'guard' }, '', location.href);
    } catch {}

    const handlePopState = () => {
      // Close open modals in priority order
      if (zoomedImage) {
        setZoomedImage(null);
      } else if (isCameraModalOpen) {
        stopCameraStream();
      } else if (isApkModalOpen) {
        setIsApkModalOpen(false);
      } else if (isDonateOpen) {
        setIsDonateOpen(false);
      } else if (isArchiveOpen) {
        setIsArchiveOpen(false);
      } else if (isThemeMenuOpen) {
        setIsThemeMenuOpen(false);
      } else if (filteredDateKey) {
        setFilteredDateKey(null);
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      try {
        history.pushState({ page: 'guard' }, '', location.href);
      } catch {}
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [zoomedImage, isCameraModalOpen, isApkModalOpen, isDonateOpen, isArchiveOpen, isThemeMenuOpen, filteredDateKey, stopCameraStream]);

  // Escape key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsArchiveOpen(false);
        setIsDonateOpen(false);
        setIsApkModalOpen(false);
        setZoomedImage(null);
        setIsThemeMenuOpen(false);
        stopCameraStream();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stopCameraStream]);

  // Click outside theme menu
  const themeMenuRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target as Node)) {
        setIsThemeMenuOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <>
      {/* BACKGROUND FLOATING GOLD DUST */}
      <canvas id="dustCanvas" ref={canvasRef} />

      {/* APP WRAPPER */}
      <div className="relative z-10 min-h-screen flex flex-col max-w-[1440px] mx-auto p-3">
        {/* ======================================================== */}
        {/* HEADER */}
        {/* ======================================================== */}
        <header
          className="border rounded-2xl p-3 md:px-5 mb-4 flex justify-between items-center gap-4 flex-wrap shadow-sm transition-colors"
          style={{
            background: 'var(--bg-panel)',
            borderColor: 'var(--border-color)',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          {/* Brand */}
          <div className="flex items-center gap-3">
            <img
              src="https://i.postimg.cc/vm141QYg/1793143031058.jpg"
              alt="MyDiary Logo"
              className="w-11 h-11 rounded-xl object-cover border-2 transition-transform hover:scale-105 hover:rotate-2"
              style={{
                borderColor: 'var(--accent-color)',
                boxShadow: '0 0 10px var(--accent-soft)'
              }}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = 'https://placehold.co/46x46/fd6c9e/ffffff?text=MD';
              }}
            />
            <div>
              <h1 className="font-syne text-2xl font-extrabold tracking-tight leading-tight">
                My<span className="font-serif-diary italic ml-0.5" style={{ color: 'var(--accent-color)' }}>Diary</span>
              </h1>
              <p className="text-xs font-semibold tracking-wider uppercase flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                <i className="fa-solid fa-wand-magic-sparkles" style={{ color: 'var(--accent-color)' }}></i>
                Personal Memory &amp; Life Archive
              </p>
            </div>
          </div>

          {/* Header Controls */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Live Clock & Prayer Badge */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Live Clock Card */}
              <div
                className="border px-3 py-1.5 rounded-lg flex items-center gap-2.5 transition-all cursor-default"
                style={{
                  background: 'var(--bg-card)',
                  borderColor: 'var(--border-color)',
                  boxShadow: 'var(--shadow-sm)'
                }}
                title="Masa & Tarikh Nyata"
              >
                <i className="fa-regular fa-clock text-sm" style={{ color: 'var(--accent-color)' }}></i>
                <div className="flex items-baseline font-mono-code font-bold leading-none" style={{ color: 'var(--text-main)' }}>
                  <span className="text-base tracking-wide">
                    {String(currentTime.getHours()).padStart(2, '0')}:{String(currentTime.getMinutes()).padStart(2, '0')}
                  </span>
                  <span className="text-xs font-extrabold ml-0.5" style={{ color: 'var(--accent-color)' }}>
                    :{String(currentTime.getSeconds()).padStart(2, '0')}
                  </span>
                </div>
                <div className="text-[10px] font-semibold capitalize border-l pl-2 flex flex-col leading-tight" style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
                  <span>{dayNamesMs[currentTime.getDay()]}</span>
                  <span className="font-mono-code text-[9px]">{currentTime.getDate()} {monthNamesShortMs[currentTime.getMonth()]}</span>
                </div>
              </div>

              {/* Prayer Times Badge */}
              <div
                onClick={() => {
                  showToast('Mengemas kini waktu solat & lokasi...');
                  detectLocationAndPrayers();
                }}
                className="border px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs transition-all cursor-pointer hover:border-emerald-500"
                style={{
                  background: 'var(--bg-card)',
                  borderColor: 'var(--border-color)',
                  boxShadow: 'var(--shadow-sm)'
                }}
                title="Klik untuk kemaskini lokasi solat"
              >
                <i className="fa-solid fa-mosque text-emerald-500 text-sm animate-pulse"></i>
                <div className="flex flex-col leading-tight">
                  <div className="font-extrabold flex items-center gap-1.5" style={{ color: 'var(--text-main)' }}>
                    <span>{prayerData.name}</span>
                    <span className="font-mono-code font-bold text-xs" style={{ color: 'var(--accent-color)' }}>
                      {prayerData.time}
                    </span>
                  </div>
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {prayerData.countdown}
                  </span>
                </div>
              </div>
            </div>

            {/* Header Archive Button */}
            <button
              type="button"
              onClick={() => setIsArchiveOpen(true)}
              className="border px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5 transition-all"
              style={{
                background: 'var(--bg-card)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-main)'
              }}
              title="Buka Arkib Catatan"
            >
              <i className="fa-solid fa-box-archive" style={{ color: 'var(--accent-color)' }}></i>
              Arkib (<span className="font-bold">{totalEntries}</span>)
            </button>

            {/* APK / PWA Install Button */}
            <button
              type="button"
              onClick={() => setIsApkModalOpen(true)}
              className="border px-3.5 py-1.5 rounded-full text-xs font-extrabold cursor-pointer inline-flex items-center gap-1.5 transition-all text-white shadow-sm hover:opacity-95"
              style={{
                background: isInstalled
                  ? '#10b981'
                  : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                borderColor: '#059669',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.35)'
              }}
              title="Pasang sebagai Aplikasi Android (APK / WebAPK)"
            >
              <i className="fa-brands fa-android text-sm"></i>
              {isInstalled ? 'Dipasang (APK)' : 'Pasang APK'}
            </button>

            {/* Theme Selector */}
            <div className="relative" ref={themeMenuRef}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsThemeMenuOpen((prev) => !prev);
                }}
                className="border px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5 transition-all"
                style={{
                  background: 'var(--bg-card)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-main)'
                }}
              >
                <i className="fa-solid fa-palette"></i> Tema
              </button>

              {isThemeMenuOpen && (
                <div
                  className="absolute top-[120%] right-0 border rounded-lg p-1.5 flex flex-col gap-1 min-w-[170px] z-50 shadow-xl"
                  style={{
                    background: 'var(--bg-panel)',
                    borderColor: 'var(--border-color)',
                    boxShadow: 'var(--shadow-lg)'
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setThemeState('theme-pink');
                      setIsThemeMenuOpen(false);
                      showToast('Tema French Pink diaktifkan!');
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs rounded text-left transition-colors hover:opacity-90 w-full"
                    style={{
                      color: 'var(--text-main)',
                      background: theme === 'theme-pink' ? 'var(--accent-soft)' : 'transparent'
                    }}
                  >
                    <span className="w-3.5 h-3.5 rounded-full border border-white/40" style={{ background: '#fd6c9e' }}></span>
                    French Pink
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setThemeState('theme-navy');
                      setIsThemeMenuOpen(false);
                      showToast('Tema Biru Navy diaktifkan!');
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs rounded text-left transition-colors hover:opacity-90 w-full"
                    style={{
                      color: 'var(--text-main)',
                      background: theme === 'theme-navy' ? 'var(--accent-soft)' : 'transparent'
                    }}
                  >
                    <span className="w-3.5 h-3.5 rounded-full border border-white/40" style={{ background: '#1d4ed8' }}></span>
                    Biru Navy
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setThemeState('theme-black');
                      setIsThemeMenuOpen(false);
                      showToast('Tema Hitam Karbon & Emas diaktifkan!');
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs rounded text-left transition-colors hover:opacity-90 w-full"
                    style={{
                      color: 'var(--text-main)',
                      background: theme === 'theme-black' ? 'var(--accent-soft)' : 'transparent'
                    }}
                  >
                    <span className="w-3.5 h-3.5 rounded-full border border-white/40" style={{ background: '#eab308' }}></span>
                    Hitam Karbon
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ======================================================== */}
        {/* MAIN JOURNAL GRID */}
        {/* ======================================================== */}
        <main className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 flex-1 items-start">
          {/* ----------------- LEFT COLUMN: MOTIVATION & CALENDAR ----------------- */}
          <aside
            className="border rounded-2xl p-4 transition-colors"
            style={{
              background: 'var(--bg-panel)',
              borderColor: 'var(--border-color)',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            {/* Daily Quote Box */}
            <div
              className="p-3 rounded-r-lg mb-4 text-xs italic border-l-[3px]"
              style={{
                background: 'var(--bg-canvas)',
                borderLeftColor: 'var(--accent-color)'
              }}
            >
              <p className="mb-1 leading-relaxed" style={{ color: 'var(--text-main)' }}>
                "{currentQuote}"
              </p>
              <span className="text-[11px] font-semibold block text-right not-italic" style={{ color: 'var(--accent-color)' }}>
                Hari {dayOfMonth} • Motivasi Harian
              </span>
            </div>

            {/* Calendar Widget */}
            <div className="mb-2">
              <div className="flex justify-between items-center mb-2 text-xs font-bold" style={{ color: 'var(--text-main)' }}>
                <button
                  type="button"
                  onClick={() => {
                    const prev = new Date(calendarCursor);
                    prev.setMonth(prev.getMonth() - 1, 1);
                    setCalendarCursor(prev);
                  }}
                  className="w-7 h-7 rounded flex items-center justify-center border transition-all hover:text-white"
                  style={{
                    background: 'var(--bg-canvas)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-main)'
                  }}
                  title="Bulan Lepas"
                >
                  <i className="fa-solid fa-chevron-left text-[11px]"></i>
                </button>

                <span>
                  {monthNamesMs[calMonth]} {calYear}
                </span>

                <button
                  type="button"
                  onClick={() => {
                    const next = new Date(calendarCursor);
                    next.setMonth(next.getMonth() + 1, 1);
                    setCalendarCursor(next);
                  }}
                  className="w-7 h-7 rounded flex items-center justify-center border transition-all hover:text-white"
                  style={{
                    background: 'var(--bg-canvas)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-main)'
                  }}
                  title="Bulan Hadapan"
                >
                  <i className="fa-solid fa-chevron-right text-[11px]"></i>
                </button>
              </div>

              {/* Calendar Weekdays */}
              <div className="grid grid-cols-7 text-center text-[10px] font-bold mb-1" style={{ color: 'var(--text-muted)' }}>
                <span>Ah</span>
                <span>Is</span>
                <span>Se</span>
                <span>Ra</span>
                <span>Kh</span>
                <span>Ju</span>
                <span>Sa</span>
              </div>

              {/* Calendar Grid Days */}
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDayOfMonthIndex }).map((_, i) => (
                  <div key={`empty_${i}`} className="aspect-square"></div>
                ))}

                {Array.from({ length: daysInCurrentMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                  const isToday =
                    currentTime.getFullYear() === calYear &&
                    currentTime.getMonth() === calMonth &&
                    currentTime.getDate() === dayNum;

                  const entriesOnDate = entries.filter((e) => toDateKey(new Date(e.timestamp)) === dateStr);
                  const hasEntry = entriesOnDate.length > 0;
                  const hasFutureEntry = entriesOnDate.some((e) => new Date(e.timestamp).getTime() > Date.now());
                  const isFilterActive = filteredDateKey === dateStr;

                  return (
                    <button
                      key={dateStr}
                      type="button"
                      onClick={() => {
                        if (isFilterActive) {
                          setFilteredDateKey(null);
                        } else {
                          setFilteredDateKey(dateStr);
                          if (!editingEntryId) {
                            const now = new Date();
                            setCustomDateTime(
                              `${dateStr}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
                            );
                          }
                          setIsArchiveOpen(true);
                        }
                      }}
                      className="aspect-square flex flex-col items-center justify-center text-xs rounded transition-all relative border cursor-pointer"
                      style={{
                        background: isFilterActive
                          ? 'var(--accent-color)'
                          : 'transparent',
                        color: isFilterActive
                          ? '#ffffff'
                          : 'var(--text-main)',
                        borderColor: isToday ? 'var(--accent-color)' : 'transparent',
                        fontWeight: isToday || isFilterActive ? 800 : 500
                      }}
                    >
                      <span>{dayNum}</span>
                      {hasEntry && (
                        <span
                          className="w-1 h-1 rounded-full absolute bottom-1"
                          style={{
                            background: isFilterActive
                              ? '#ffffff'
                              : hasFutureEntry
                              ? '#3b82f6'
                              : 'var(--accent-color)'
                          }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend & Reset Filter */}
              <div className="flex justify-between items-center mt-2.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: 'var(--accent-color)' }}></span>
                  Ada Catatan
                  <span className="w-1.5 h-1.5 rounded-full inline-block bg-blue-500 ml-1.5"></span>
                  Masa Depan
                </span>
                {filteredDateKey && (
                  <button
                    type="button"
                    onClick={() => setFilteredDateKey(null)}
                    className="cursor-pointer font-bold hover:underline"
                    style={{ color: 'var(--accent-color)' }}
                  >
                    Lihat Semua
                  </button>
                )}
              </div>
            </div>
          </aside>

          {/* ----------------- RIGHT COLUMN: JOURNAL ENTRY EDITOR ----------------- */}
          <section
            id="editorPanelContainer"
            className="border rounded-2xl p-4 md:p-5 transition-colors"
            style={{
              background: 'var(--bg-panel)',
              borderColor: 'var(--border-color)',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            {/* Panel Header */}
            <div className="flex justify-between items-center pb-2.5 mb-3 border-b gap-2 flex-wrap" style={{ borderColor: 'var(--border-color)' }}>
              <span className="text-sm md:text-base font-bold flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                <i className="fa-solid fa-pen-nib" style={{ color: 'var(--accent-color)' }}></i>
                {editingEntryId ? 'Sunting Semula Catatan' : 'Coretan & Rancangan Baharu'}
              </span>
              <span className="text-xs font-mono-code" style={{ color: 'var(--text-muted)' }}>
                {formattedHeaderDate}
              </span>
            </div>

            {/* Editing Status Banner */}
            {editingEntryId && (
              <div className="flex justify-between items-center p-2.5 mb-3 rounded-lg text-xs font-semibold bg-blue-500/10 border border-blue-500 text-blue-600 dark:text-blue-300">
                <span className="flex items-center gap-2">
                  <i className="fa-solid fa-pen-to-square"></i>
                  Sedang menyunting catatan yang dipilih
                </span>
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    showToast('Suntingan dibatalkan.');
                  }}
                  className="px-2.5 py-1 text-xs rounded bg-white dark:bg-zinc-800 border border-blue-300 dark:border-blue-700 cursor-pointer font-bold hover:bg-blue-50"
                >
                  Batal
                </button>
              </div>
            )}

            {/* Entry Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveEntry(false);
              }}
              className="flex flex-col gap-3.5"
            >
              {/* Date & Time Picker Card */}
              <div
                className="p-3 rounded-xl border flex flex-col gap-2"
                style={{
                  background: 'var(--bg-canvas)',
                  borderColor: 'var(--border-color)'
                }}
              >
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <label htmlFor="customEntryDateInput" className="text-xs font-bold flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                    <i className="fa-regular fa-calendar-plus" style={{ color: 'var(--accent-color)' }}></i>
                    Tarikh &amp; Masa Catatan:
                  </label>
                  <div className="flex items-center gap-2">
                    {isSelectedDateFuture && (
                      <span className="bg-blue-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <i className="fa-solid fa-rocket"></i> Rancangan Masa Depan
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setCustomDateTime(formatToDateTimeLocal(new Date()));
                        showToast('Tarikh ditetapkan ke waktu semasa.');
                      }}
                      className="border px-2.5 py-0.5 rounded-full text-[11px] font-semibold cursor-pointer transition-all hover:border-pink-500"
                      style={{
                        background: 'var(--bg-panel)',
                        borderColor: 'var(--border-color)',
                        color: 'var(--text-main)'
                      }}
                    >
                      <i className="fa-solid fa-rotate-left mr-1"></i> Waktu Sekarang
                    </button>
                  </div>
                </div>

                <input
                  type="datetime-local"
                  id="customEntryDateInput"
                  value={customDateTime}
                  onChange={(e) => setCustomDateTime(e.target.value)}
                  className="w-full border rounded-lg px-3 py-1.5 text-xs font-mono-code outline-none transition-all"
                  style={{
                    background: 'var(--bg-panel)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-main)'
                  }}
                  required
                />
              </div>

              {/* Title Input */}
              <input
                type="text"
                value={entryTitle}
                onChange={(e) => setEntryTitle(e.target.value)}
                placeholder="Tajuk catatan atau perancangan..."
                maxLength={120}
                required
                className="w-full border rounded-xl px-3.5 py-2 text-base font-bold outline-none transition-all"
                style={{
                  background: 'var(--bg-canvas)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-main)'
                }}
              />

              {/* Mood & Category Pickers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <select
                  value={entryMood}
                  onChange={(e) => setEntryMood(e.target.value)}
                  className="w-full border rounded-xl px-3.5 py-2 text-xs font-medium outline-none transition-all cursor-pointer"
                  style={{
                    background: 'var(--bg-canvas)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-main)'
                  }}
                >
                  <option value="🌸 Tenang & Bahagia">🌸 Tenang &amp; Bahagia</option>
                  <option value="✨ Bersemangat">✨ Bersemangat</option>
                  <option value="💭 Bertafakur">💭 Bertafakur</option>
                  <option value="⚡ Produktif">⚡ Produktif</option>
                  <option value="🌧️ Sayu / Santai">🌧️ Sayu / Santai</option>
                </select>

                <select
                  value={entryCategory}
                  onChange={(e) => setEntryCategory(e.target.value)}
                  className="w-full border rounded-xl px-3.5 py-2 text-xs font-medium outline-none transition-all cursor-pointer"
                  style={{
                    background: 'var(--bg-canvas)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-main)'
                  }}
                >
                  <option value="Catatan Harian">Catatan Harian</option>
                  <option value="Perancangan & Matlamat">Perancangan &amp; Matlamat</option>
                  <option value="Kenangan Indah">Kenangan Indah</option>
                  <option value="Idea & Kreativiti">Idea &amp; Kreativiti</option>
                  <option value="Tugasan / Kerja">Tugasan / Kerja</option>
                </select>
              </div>

              {/* Content Textarea */}
              <textarea
                value={entryContent}
                onChange={(e) => setEntryContent(e.target.value)}
                placeholder="Tuliskan pengalaman, perasaan, atau rancangan masa hadapan anda di sini..."
                rows={6}
                required
                className="w-full border rounded-xl p-3.5 text-sm leading-relaxed outline-none transition-all resize-y"
                style={{
                  background: 'var(--bg-canvas)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-main)'
                }}
              />

              {/* ----------------- PHOTO ATTACHMENTS ----------------- */}
              <div
                className="border rounded-xl p-3"
                style={{
                  background: 'var(--bg-canvas)',
                  borderColor: 'var(--border-color)'
                }}
              >
                <div className="flex justify-between items-center flex-wrap gap-2 mb-2 text-xs font-bold" style={{ color: 'var(--text-main)' }}>
                  <span className="flex items-center gap-1.5">
                    <i className="fa-regular fa-image" style={{ color: 'var(--accent-color)' }}></i>
                    Lampiran Gambar ({attachedPhotos.length}/10)
                  </span>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Gallery input */}
                    <input
                      type="file"
                      ref={fileGalleryInputRef}
                      onChange={(e) => handlePhotoFiles(e.target.files)}
                      accept="image/*"
                      multiple
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileGalleryInputRef.current?.click()}
                      className="border px-2.5 py-1 rounded text-xs font-semibold cursor-pointer inline-flex items-center gap-1 transition-all"
                      style={{
                        background: 'var(--bg-panel)',
                        borderColor: 'var(--border-color)',
                        color: 'var(--text-main)'
                      }}
                    >
                      <i className="fa-solid fa-images"></i> Galeri
                    </button>

                    {/* Camera system direct input */}
                    <input
                      type="file"
                      ref={fileCameraInputRef}
                      onChange={(e) => handlePhotoFiles(e.target.files)}
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileCameraInputRef.current?.click()}
                      className="border px-2.5 py-1 rounded text-xs font-semibold cursor-pointer inline-flex items-center gap-1 transition-all"
                      style={{
                        background: 'var(--bg-panel)',
                        borderColor: 'var(--border-color)',
                        color: 'var(--text-main)'
                      }}
                      title="Buka aplikasi kamera terus"
                    >
                      <i className="fa-solid fa-camera"></i> Ambil Foto
                    </button>

                    {/* Viewfinder 1:1 modal trigger */}
                    <button
                      type="button"
                      onClick={openCameraModal}
                      className="border px-2.5 py-1 rounded text-xs font-semibold cursor-pointer inline-flex items-center gap-1 transition-all"
                      style={{
                        background: 'var(--bg-panel)',
                        borderColor: 'var(--border-color)',
                        color: 'var(--text-main)'
                      }}
                      title="Buka lensa viewfinder 1:1"
                    >
                      <i className="fa-solid fa-expand"></i> Viewfinder 1:1
                    </button>
                  </div>
                </div>

                {/* Dropdown Cursor Image Previewer */}
                {attachedPhotos.length > 0 && (
                  <div
                    className="mt-2.5 p-2.5 rounded-xl border flex flex-col gap-2"
                    style={{
                      background: 'var(--bg-panel)',
                      borderColor: 'var(--border-color)'
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPhotoCursorIndex((prev) => (prev - 1 + attachedPhotos.length) % attachedPhotos.length);
                        }}
                        className="w-7 h-7 rounded border flex items-center justify-center text-xs cursor-pointer"
                        style={{
                          background: 'var(--bg-canvas)',
                          borderColor: 'var(--border-color)',
                          color: 'var(--text-main)'
                        }}
                        title="Foto Sebelumnya"
                      >
                        <i className="fa-solid fa-chevron-left"></i>
                      </button>

                      <select
                        value={photoCursorIndex}
                        onChange={(e) => setPhotoCursorIndex(Number(e.target.value))}
                        className="flex-1 border rounded px-2 py-1 text-xs outline-none"
                        style={{
                          background: 'var(--bg-canvas)',
                          borderColor: 'var(--border-color)',
                          color: 'var(--text-main)'
                        }}
                      >
                        {attachedPhotos.map((_, idx) => (
                          <option key={idx} value={idx}>
                            Gambar {idx + 1} daripada {attachedPhotos.length}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => {
                          setPhotoCursorIndex((prev) => (prev + 1) % attachedPhotos.length);
                        }}
                        className="w-7 h-7 rounded border flex items-center justify-center text-xs cursor-pointer"
                        style={{
                          background: 'var(--bg-canvas)',
                          borderColor: 'var(--border-color)',
                          color: 'var(--text-main)'
                        }}
                        title="Foto Seterusnya"
                      >
                        <i className="fa-solid fa-chevron-right"></i>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAttachedPhotos((prev) => {
                            const next = prev.filter((_, i) => i !== photoCursorIndex);
                            setPhotoCursorIndex(Math.max(0, next.length - 1));
                            return next;
                          });
                          showToast('Foto dipadam daripada lampiran.');
                        }}
                        className="w-7 h-7 rounded border border-red-300 dark:border-red-900 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center text-xs cursor-pointer"
                        title="Padam Foto Ini"
                      >
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    </div>

                    <div className="relative w-full aspect-square max-h-[360px] rounded-lg overflow-hidden bg-black flex items-center justify-center mx-auto">
                      <img
                        src={attachedPhotos[photoCursorIndex]}
                        alt="Pratonton Lampiran"
                        onClick={() => setZoomedImage(attachedPhotos[photoCursorIndex])}
                        className="w-full h-full object-cover cursor-zoom-in"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* ----------------- AUDIO RECORDING (3 MULTI-SLOT) ----------------- */}
              <div
                className="border rounded-xl p-3"
                style={{
                  background: 'var(--bg-canvas)',
                  borderColor: 'var(--border-color)'
                }}
              >
                <div className="flex justify-between items-center mb-2 text-xs font-bold" style={{ color: 'var(--text-main)' }}>
                  <span className="flex items-center gap-1.5">
                    <i className="fa-solid fa-microphone-lines" style={{ color: 'var(--accent-color)' }}></i>
                    Rakaman Suara (3 Slot)
                  </span>

                  {isRecording && (
                    <span className="font-mono-code text-xs text-red-500 flex items-center gap-1 font-bold animate-pulse">
                      <i className="fa-solid fa-circle text-[9px]"></i>
                      {String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:
                      {String(recordingSeconds % 60).padStart(2, '0')}
                    </span>
                  )}
                </div>

                {/* Audio Tabs */}
                <div className="flex gap-1.5 mb-2.5">
                  {[0, 1, 2].map((slot) => {
                    const hasAudio = attachedAudios[slot] !== null;
                    const isActive = activeAudioSlot === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => {
                          if (isRecording) {
                            showToast('Sila berhenti merakam sebelum menukar slot audio.');
                            return;
                          }
                          setActiveAudioSlot(slot);
                        }}
                        className="flex-1 py-1.5 px-2 rounded border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        style={{
                          background: isActive ? 'var(--accent-soft)' : 'var(--bg-panel)',
                          borderColor: isActive ? 'var(--accent-color)' : 'var(--border-color)',
                          color: isActive ? 'var(--accent-color)' : 'var(--text-muted)'
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{
                            background: hasAudio ? '#10b981' : '#ccc'
                          }}
                        />
                        Audio {slot + 1}
                      </button>
                    );
                  })}
                </div>

                {/* Audio Controls */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={toggleRecording}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold text-white inline-flex items-center gap-1.5 cursor-pointer transition-all ${
                      isRecording ? 'bg-red-700 animate-pulse' : 'bg-red-500 hover:bg-red-600'
                    }`}
                  >
                    <i className={`fa-solid ${isRecording ? 'fa-stop' : 'fa-microphone'}`}></i>
                    {isRecording ? 'Berhenti Rakam' : 'Mula Rakam'}
                  </button>

                  {/* Audio Playback Element */}
                  {attachedAudios[activeAudioSlot] && (
                    <>
                      <audio
                        controls
                        src={attachedAudios[activeAudioSlot] || undefined}
                        className="flex-1 min-w-[140px] h-8"
                      />
                      <button
                        type="button"
                        onClick={deleteCurrentAudioSlot}
                        className="w-7 h-7 rounded border border-red-300 dark:border-red-900 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center text-xs cursor-pointer"
                        title="Padam Audio Ini"
                      >
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    </>
                  )}
                </div>

                {recordingError && (
                  <p className="mt-2 text-xs text-red-500 font-semibold">{recordingError}</p>
                )}
              </div>

              {/* ----------------- SUBMIT BUTTONS ROW ----------------- */}
              <div className="flex gap-2.5 flex-wrap pt-2">
                <button
                  type="submit"
                  className="flex-1 min-w-[160px] py-2.5 px-4 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 cursor-pointer transition-transform hover:-translate-y-0.5 shadow-sm"
                  style={{
                    background: 'var(--accent-color)'
                  }}
                >
                  <i className={`fa-solid ${editingEntryId ? 'fa-check' : 'fa-floppy-disk'}`}></i>
                  {editingEntryId ? 'Kemas Kini Catatan' : 'Simpan Catatan'}
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveEntry(true)}
                  className="py-2.5 px-4 rounded-xl text-xs font-bold border border-blue-500 text-blue-600 hover:bg-blue-600 hover:text-white flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-sm"
                  style={{
                    background: 'var(--bg-panel)'
                  }}
                  title="Simpan dan buka Google Calendar"
                >
                  <i className="fa-brands fa-google text-blue-500 group-hover:text-white"></i>
                  Simpan &amp; Jadual di Google Calendar
                </button>
              </div>
            </form>
          </section>
        </main>

        {/* ======================================================== */}
        {/* FOOTER */}
        {/* ======================================================== */}
        <footer className="mt-6 py-5 pb-20 text-center flex flex-col items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          <button
            type="button"
            onClick={() => setIsDonateOpen(true)}
            className="border px-4 py-2 rounded-full font-bold text-xs cursor-pointer inline-flex items-center gap-1.5 transition-transform hover:-translate-y-0.5 shadow-sm"
            style={{
              background: 'var(--bg-panel)',
              borderColor: 'var(--accent-color)',
              color: 'var(--accent-color)'
            }}
          >
            <i className="fa-solid fa-heart" style={{ color: '#fd6c9e' }}></i> Donate for more inovation
          </button>
          <p>© 2026 MyDiary. Dikuasakan oleh Vanilla JS, CSS &amp; React SPA Tulen.</p>
        </footer>
      </div>

      {/* ======================================================== */}
      {/* FLOATING ARCHIVE BUTTON */}
      {/* ======================================================== */}
      <button
        type="button"
        onClick={() => setIsArchiveOpen(true)}
        className="fixed bottom-6 right-6 text-white px-5 py-3 rounded-full font-extrabold text-sm flex items-center gap-2 cursor-pointer z-40 transition-all hover:-translate-y-1 hover:scale-105 shadow-xl"
        style={{
          background: 'linear-gradient(135deg, #ff9a8b 0%, #ff6a88 100%)',
          boxShadow: '0 6px 20px rgba(255, 106, 136, 0.45)'
        }}
        title="Buka Arkib Catatan"
      >
        <i className="fa-solid fa-face-laugh-beam text-base"></i>
        Arkib (<span className="font-bold">{totalEntries}</span>)
      </button>

      {/* ======================================================== */}
      {/* JOYFUL ARCHIVE DRAWER (SLIDE-OVER DROPSIDE) */}
      {/* ======================================================== */}
      {/* Backdrop */}
      <div
        onClick={() => setIsArchiveOpen(false)}
        className={`fixed inset-0 bg-black/45 backdrop-blur-xs z-50 transition-opacity duration-300 ${
          isArchiveOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Slide-over panel */}
      <aside
        className={`fixed top-0 right-0 w-full max-w-[480px] h-screen h-[100dvh] border-l z-50 shadow-2xl flex flex-col overflow-hidden transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isArchiveOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          background: 'var(--bg-panel)',
          borderColor: 'var(--border-color)'
        }}
      >
        {/* Joy Banner Stage */}
        <div
          className="relative shrink-0 h-[115px] w-full flex items-center justify-center text-white overflow-hidden animate-joy-gradient"
          style={{
            background: 'linear-gradient(135deg, #ff758c 0%, #ff7eb3 25%, #ffb199 50%, #fcd34d 75%, #a7f3d0 100%)'
          }}
        >
          {/* Confetti Layer */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <span className="confetti-piece left-[8%] bg-yellow-400 delay-100"></span>
            <span className="confetti-piece left-[22%] bg-emerald-400 w-1.5 h-2.5 delay-700"></span>
            <span className="confetti-piece left-[38%] bg-pink-500 delay-1000"></span>
            <span className="confetti-piece left-[55%] bg-cyan-400 delay-300"></span>
            <span className="confetti-piece left-[74%] bg-amber-300 w-2.5 h-2.5 rounded-full delay-1200"></span>
            <span className="confetti-piece left-[88%] bg-purple-500 delay-900"></span>
          </div>

          {/* Balloons */}
          <span className="absolute bottom-[-20px] left-3 text-2xl opacity-90 animate-balloon drop-shadow" title="Yay!">
            🎈
          </span>
          <span className="absolute bottom-[-20px] right-3 text-2xl opacity-90 animate-balloon delay-1000 drop-shadow" title="Fun!">
            🎉
          </span>

          {/* Interactive Mascot */}
          <div
            onClick={cycleMascot}
            className="absolute bottom-1.5 text-4xl cursor-pointer select-none animate-mascot-bounce drop-shadow-md"
            title="Klik saya untuk keceriaan!"
          >
            {joyMascotEmoji}
          </div>

          {/* Joy Title Pill */}
          <div className="relative z-10 bg-white/25 backdrop-blur-md px-3.5 py-1 rounded-full text-xs font-extrabold tracking-wide text-white border border-white/65 flex items-center gap-1.5 -translate-y-4 shadow-sm animate-joy-pill">
            <i className="fa-solid fa-face-laugh-beam text-yellow-300"></i>
            Joyful Memories • Happy Go Lucky!
          </div>
        </div>

        {/* Stats Grid Box */}
        <div
          className="border rounded-xl p-3 mx-4 my-2.5"
          style={{
            background: 'var(--bg-canvas)',
            borderColor: 'var(--border-color)'
          }}
        >
          <div className="text-[11px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
            <i className="fa-solid fa-chart-pie" style={{ color: 'var(--accent-color)' }}></i>
            Ringkasan Arkib Anda
          </div>

          <div className="grid grid-cols-4 gap-1.5 text-center">
            <div className="p-1.5 rounded border" style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-color)' }}>
              <div className="text-base font-extrabold font-syne" style={{ color: 'var(--accent-color)' }}>{totalEntries}</div>
              <div className="text-[9px] uppercase font-bold" style={{ color: 'var(--text-muted)' }}>Catatan</div>
            </div>
            <div className="p-1.5 rounded border" style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-color)' }}>
              <div className="text-base font-extrabold font-syne" style={{ color: 'var(--accent-color)' }}>{totalPhotos}</div>
              <div className="text-[9px] uppercase font-bold" style={{ color: 'var(--text-muted)' }}>Foto</div>
            </div>
            <div className="p-1.5 rounded border" style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-color)' }}>
              <div className="text-base font-extrabold font-syne" style={{ color: 'var(--accent-color)' }}>{totalAudios}</div>
              <div className="text-[9px] uppercase font-bold" style={{ color: 'var(--text-muted)' }}>Audio</div>
            </div>
            <div className="p-1.5 rounded border" style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-color)' }}>
              <div className="text-base font-extrabold font-syne" style={{ color: 'var(--accent-color)' }}>{totalFuture}</div>
              <div className="text-[9px] uppercase font-bold" style={{ color: 'var(--text-muted)' }}>Hadapan</div>
            </div>
          </div>
        </div>

        {/* Dropside Header */}
        <div className="px-4 py-2 border-b flex justify-between items-center shrink-0" style={{ borderColor: 'var(--border-color)' }}>
          <div className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>
            Senarai Catatan ({filteredEntries.length})
            {filteredDateKey && (
              <span className="text-xs font-normal ml-1 text-blue-500">({filteredDateKey})</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsArchiveOpen(false)}
            className="w-7 h-7 rounded border flex items-center justify-center cursor-pointer transition-colors"
            style={{
              background: 'var(--bg-canvas)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-main)'
            }}
            title="Tutup Arkib"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Search bar */}
        <div className="p-3 border-b shrink-0" style={{ borderColor: 'var(--border-color)' }}>
          <div className="relative">
            <input
              type="text"
              value={archiveSearch}
              onChange={(e) => setArchiveSearch(e.target.value)}
              placeholder="Cari tajuk atau isi catatan..."
              className="w-full border rounded-lg px-3 py-1.5 text-xs outline-none"
              style={{
                background: 'var(--bg-canvas)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-main)'
              }}
            />
            {archiveSearch && (
              <button
                type="button"
                onClick={() => setArchiveSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-600"
              >
                &times;
              </button>
            )}
          </div>
        </div>

        {/* Entries scroll area */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {filteredEntries.length === 0 ? (
            <div className="text-center py-10 text-xs" style={{ color: 'var(--text-muted)' }}>
              <i className="fa-regular fa-folder-open text-3xl mb-2 block opacity-40"></i>
              Tiada catatan ditemui.
            </div>
          ) : (
            filteredEntries.map((entry) => {
              const d = new Date(entry.timestamp);
              const isFuture = d.getTime() > Date.now();
              const dateStr = d.toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' });
              const timeStr = d.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' });

              return (
                <article
                  key={entry.id}
                  className="border rounded-xl p-3 flex flex-col gap-2 shadow-xs transition-colors"
                  style={{
                    background: 'var(--bg-card)',
                    borderColor: 'var(--border-color)'
                  }}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>
                          {entry.title}
                        </h4>
                        {isFuture && (
                          <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1">
                            <i className="fa-solid fa-rocket"></i> Masa Depan
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] flex items-center gap-2 mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        <span><i className="fa-regular fa-calendar mr-1"></i>{dateStr}</span>
                        <span><i className="fa-regular fa-clock mr-1"></i>{timeStr}</span>
                      </div>
                    </div>
                    <span className="text-sm shrink-0">{entry.mood}</span>
                  </div>

                  <p className="text-xs leading-relaxed whitespace-pre-wrap break-words" style={{ color: 'var(--text-main)' }}>
                    {entry.content}
                  </p>

                  {/* Photo thumbnails */}
                  {entry.photos && entry.photos.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap mt-1">
                      {entry.photos.map((photo, i) => (
                        <img
                          key={i}
                          src={photo}
                          alt="Foto"
                          onClick={() => setZoomedImage(photo)}
                          className="w-12 h-12 object-cover rounded border cursor-pointer hover:opacity-90"
                          style={{ borderColor: 'var(--border-color)' }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Audio players */}
                  {entry.audios && entry.audios.some(Boolean) && (
                    <div className="flex flex-col gap-1 mt-1">
                      {entry.audios.map((audio, i) => {
                        if (!audio) return null;
                        return (
                          <audio
                            key={i}
                            controls
                            src={audio}
                            className="w-full h-7"
                          />
                        );
                      })}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex justify-between items-center pt-2 border-t border-dashed mt-1" style={{ borderColor: 'var(--border-color)' }}>
                    <span
                      className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: 'var(--accent-soft)',
                        color: 'var(--accent-color)'
                      }}
                    >
                      #{entry.category}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => startEditEntry(entry)}
                        className="w-7 h-7 rounded border flex items-center justify-center text-xs hover:border-blue-500 hover:text-blue-500 cursor-pointer transition-colors"
                        style={{
                          background: 'var(--bg-canvas)',
                          borderColor: 'var(--border-color)',
                          color: 'var(--text-main)'
                        }}
                        title="Sunting Semula Catatan Ini"
                      >
                        <i className="fa-solid fa-pen-to-square"></i>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const gcalUrl = buildGoogleCalendarLink(entry);
                          window.open(gcalUrl, '_blank');
                        }}
                        className="w-7 h-7 rounded border flex items-center justify-center text-xs hover:border-blue-500 cursor-pointer transition-colors"
                        style={{
                          background: 'var(--bg-canvas)',
                          borderColor: 'var(--border-color)'
                        }}
                        title="Buka di Google Calendar"
                      >
                        <i className="fa-brands fa-google text-blue-500"></i>
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteEntry(entry.id)}
                        className="w-7 h-7 rounded border border-red-300 dark:border-red-900 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center text-xs cursor-pointer transition-colors"
                        title="Padam Catatan"
                      >
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </aside>

      {/* ======================================================== */}
      {/* CAMERA 1:1 VIEWFINDER MODAL */}
      {/* ======================================================== */}
      {isCameraModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div
            className="border rounded-2xl p-4 w-full max-w-[420px] shadow-2xl relative"
            style={{
              background: 'var(--bg-panel)',
              borderColor: 'var(--border-color)'
            }}
          >
            <button
              type="button"
              onClick={stopCameraStream}
              className="absolute top-3 right-3 text-2xl font-light text-zinc-400 hover:text-zinc-600 cursor-pointer"
            >
              &times;
            </button>

            <h3 className="text-sm font-bold mb-0.5" style={{ color: 'var(--text-main)' }}>
              Kamera Peranti (1:1)
            </h3>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
              {cameraStatusText}
            </p>

            {/* Video Viewfinder */}
            <div className="relative w-full aspect-square max-w-[320px] bg-black rounded-xl overflow-hidden mx-auto border-2 border-zinc-700 flex items-center justify-center">
              <video
                ref={cameraVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>

            {/* Camera Controls */}
            <div className="flex justify-center items-center gap-6 mt-4">
              <button
                type="button"
                onClick={flipCamera}
                className="w-9 h-9 rounded-full border flex items-center justify-center text-sm cursor-pointer hover:border-pink-500"
                style={{
                  background: 'var(--bg-canvas)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-main)'
                }}
                title="Tukar Kamera"
              >
                <i className="fa-solid fa-arrows-rotate"></i>
              </button>

              <button
                type="button"
                onClick={takePhotoFromViewfinder}
                className="w-14 h-14 rounded-full border-4 border-white flex items-center justify-center text-white text-xl cursor-pointer shadow-lg hover:scale-105 transition-transform"
                style={{ background: 'var(--accent-color)' }}
                title="Tangkap Gambar"
              >
                <i className="fa-solid fa-camera"></i>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DONATE MODAL */}
      {/* ======================================================== */}
      {isDonateOpen && (
        <div
          onClick={() => setIsDonateOpen(false)}
          className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="border rounded-2xl p-5 w-full max-w-[400px] shadow-2xl relative text-center"
            style={{
              background: 'var(--bg-panel)',
              borderColor: 'var(--border-color)'
            }}
          >
            <button
              type="button"
              onClick={() => setIsDonateOpen(false)}
              className="absolute top-3 right-3 text-2xl font-light text-zinc-400 hover:text-zinc-600 cursor-pointer"
            >
              &times;
            </button>

            <h3 className="text-lg font-extrabold font-syne mb-1" style={{ color: 'var(--text-main)' }}>
              Sokong Inovasi
            </h3>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
              Terima kasih atas sokongan anda untuk pembangunan fitur baharu!
            </p>

            <div
              className="p-3 rounded-xl border max-w-[260px] mx-auto bg-white shadow-sm"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <img
                src="https://i.postimg.cc/9Fxwv43T/MAE-QR-20261029-093107.jpg"
                alt="Kod QR DuitNow"
                className="w-full h-auto rounded"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = 'https://placehold.co/240x240/fd6c9e/ffffff?text=QR+Code';
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* APK & PWA INSTALL MODAL */}
      {/* ======================================================== */}
      {isApkModalOpen && (
        <div
          onClick={() => setIsApkModalOpen(false)}
          className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-3.5"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="border rounded-2xl p-4 md:p-6 w-full max-w-[500px] shadow-2xl relative max-h-[90vh] overflow-y-auto"
            style={{
              background: 'var(--bg-panel)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-main)'
            }}
          >
            <button
              type="button"
              onClick={() => setIsApkModalOpen(false)}
              className="absolute top-3.5 right-3.5 text-2xl font-light text-zinc-400 hover:text-zinc-600 cursor-pointer"
            >
              &times;
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 mb-4 pb-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <img
                src="/icon.svg"
                alt="MyDiary Logo"
                className="w-12 h-12 rounded-xl object-cover border-2 shadow-sm"
                style={{ borderColor: 'var(--accent-color)' }}
              />
              <div>
                <h3 className="text-base md:text-lg font-extrabold font-syne flex items-center gap-2">
                  <i className="fa-brands fa-android text-emerald-500"></i>
                  Pasang APK &amp; PWA
                </h3>
                <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                  Aplikasi Android Rasmi MyDiary • 100% Berfungsi
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3.5">
              {/* Option 1: Direct Install (WebAPK) */}
              <div
                className="p-3.5 rounded-xl border flex flex-col gap-2.5"
                style={{
                  background: 'var(--bg-canvas)',
                  borderColor: 'var(--border-color)'
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <i className="fa-solid fa-bolt"></i> Kaedah 1: Pasang Terus (WebAPK)
                  </span>
                  <span className="text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                    Disyorkan
                  </span>
                </div>

                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-main)' }}>
                  Sistem Android akan membina fail APK sebenar secara automatik ke dalam peranti anda dengan ikon aplikasi penuh di skrin utama tanpa bingkai pelayar.
                </p>

                {isInstalled ? (
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
                    <i className="fa-solid fa-circle-check text-base"></i>
                    Aplikasi ini sudah dipasang pada peranti anda!
                  </div>
                ) : isInstallable ? (
                  <button
                    type="button"
                    onClick={async () => {
                      const success = await install();
                      if (success) {
                        showToast('MyDiary berjaya dipasang ke telefon!');
                        setIsApkModalOpen(false);
                      }
                    }}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md"
                  >
                    <i className="fa-solid fa-download"></i>
                    Pasang Sekarang ke Telefon (1-Klik)
                  </button>
                ) : (
                  <div className="text-xs p-2.5 rounded-lg border bg-zinc-50 dark:bg-zinc-800/60 leading-relaxed" style={{ borderColor: 'var(--border-color)' }}>
                    <p className="font-bold mb-1 flex items-center gap-1.5 text-zinc-700 dark:text-zinc-200">
                      <i className="fa-solid fa-mobile-screen-button text-emerald-500"></i> Cara Pasang di Google Chrome / Samsung Internet:
                    </p>
                    <ol className="list-decimal pl-4 space-y-1 text-zinc-600 dark:text-zinc-300 text-[11px]">
                      <li>Buka pautan aplikasi ini di pelayar telefon anda.</li>
                      <li>Tekan menu tiga titik (<strong>⋮</strong>) di bucu kanan atas.</li>
                      <li>Tekan <strong>"Pasang aplikasi"</strong> atau <strong>"Tambah ke Skrin Utama"</strong>.</li>
                    </ol>
                  </div>
                )}
              </div>

              {/* Option 2: Standalone .APK File (PWABuilder) */}
              <div
                className="p-3.5 rounded-xl border flex flex-col gap-2.5"
                style={{
                  background: 'var(--bg-canvas)',
                  borderColor: 'var(--border-color)'
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                    <i className="fa-brands fa-android"></i> Kaedah 2: Jana Fail .APK Mandiri
                  </span>
                  <span className="text-[10px] bg-blue-500/15 text-blue-600 dark:text-blue-300 font-bold px-2 py-0.5 rounded-full">
                    Fail .APK
                  </span>
                </div>

                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-main)' }}>
                  Jika anda mahukan fail <strong>.apk</strong> yang boleh dihantar melalui fail ke telefon lain atau dipasang secara *sideload*, gunakan alat <strong>PWABuilder</strong> yang rasmi daripada Microsoft untuk membungkus PWA ini menjadi fail APK Android.
                </p>

                <a
                  href={`https://www.pwabuilder.com/reportcard?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin : '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md no-underline text-center"
                >
                  <i className="fa-solid fa-arrow-up-right-from-square"></i>
                  Buka PWABuilder untuk Muat Turun APK
                </a>
              </div>

              {/* Feature Verification Checklist */}
              <div
                className="p-3 rounded-xl border"
                style={{
                  background: 'var(--bg-canvas)',
                  borderColor: 'var(--border-color)'
                }}
              >
                <div className="text-[11px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                  <i className="fa-solid fa-shield-check text-emerald-500"></i>
                  Semua Fungsi Telah Disahkan untuk Android
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-200">
                    <i className="fa-solid fa-check text-emerald-500 text-xs"></i>
                    <span>Kamera &amp; Viewfinder 1:1</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-200">
                    <i className="fa-solid fa-check text-emerald-500 text-xs"></i>
                    <span>Rakaman Suara 3-Slot</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-200">
                    <i className="fa-solid fa-check text-emerald-500 text-xs"></i>
                    <span>Waktu Solat JAKIM &amp; GPS</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-200">
                    <i className="fa-solid fa-check text-emerald-500 text-xs"></i>
                    <span>Google Calendar Export</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-200">
                    <i className="fa-solid fa-check text-emerald-500 text-xs"></i>
                    <span>Storan Offline (Tanpa Internet)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-200">
                    <i className="fa-solid fa-check text-emerald-500 text-xs"></i>
                    <span>Gestur Butang Kembali</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* OFFLINE CONNECTIVITY INDICATOR */}
      {/* ======================================================== */}
      {!isOnline && (
        <div className="fixed bottom-20 left-4 z-40 flex items-center gap-2 rounded-full bg-amber-600 text-white px-3.5 py-1.5 text-xs font-semibold shadow-lg animate-pulse">
          <span className="w-2 h-2 rounded-full bg-white"></span>
          Mod Luar Talian — Catatan disimpan secara tempatan (offline).
        </div>
      )}

      {/* ======================================================== */}
      {/* ZOOM IMAGE MODAL */}
      {/* ======================================================== */}
      {zoomedImage && (
        <div
          onClick={() => setZoomedImage(null)}
          className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-zoom-out"
        >
          <img
            src={zoomedImage}
            alt="Zoomed"
            className="max-w-[92vw] max-h-[90vh] rounded-xl object-contain shadow-2xl"
          />
        </div>
      )}

      {/* ======================================================== */}
      {/* TOAST NOTIFICATION */}
      {/* ======================================================== */}
      <div
        className={`fixed bottom-8 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 z-50 pointer-events-none transition-all duration-300 max-w-[90vw] ${
          toastMessage ? 'translate-y-0 opacity-100' : 'translate-y-16 opacity-0'
        }`}
      >
        <i className="fa-solid fa-circle-check text-emerald-400"></i>
        <span>{toastMessage}</span>
      </div>
    </>
  );
}
