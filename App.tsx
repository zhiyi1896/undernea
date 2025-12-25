
import React, { useState, useEffect, useRef } from 'react';
import ThreeScene, { ThreeSceneHandle } from './components/ThreeScene';
import { generateGreeting } from './services/geminiService';
import { UserPhoto } from './types';
import { Sparkles, Image as ImageIcon, MessageSquareQuote, Trash2, Wand2, X } from 'lucide-react';

const STORAGE_KEY_PHOTOS = 'stardust_photos';
const STORAGE_KEY_BLESSING = 'stardust_blessing';

const App: React.FC = () => {
  const [isStarted, setIsStarted] = useState(false);
  const [isScattered, setIsScattered] = useState(false);
  const [photos, setPhotos] = useState<UserPhoto[]>([]);
  const [blessing, setBlessing] = useState('愿岁岁常欢愉，\n年年皆胜意。');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [msg, setMsg] = useState('');

  const threeRef = useRef<ThreeSceneHandle>(null);

  // Load Persistence
  useEffect(() => {
    const savedPhotos = localStorage.getItem(STORAGE_KEY_PHOTOS);
    if (savedPhotos) setPhotos(JSON.parse(savedPhotos));
    const savedBlessing = localStorage.getItem(STORAGE_KEY_BLESSING);
    if (savedBlessing) setBlessing(savedBlessing);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PHOTOS, JSON.stringify(photos));
  }, [photos]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_BLESSING, blessing);
  }, [blessing]);

  const showToast = (text: string) => {
    setMsg(text);
    setTimeout(() => setMsg(''), 3000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target?.result as string;
        setPhotos(prev => [...prev.slice(-14), { id: Date.now().toString() + Math.random(), url: base64 }]);
      };
      reader.readAsDataURL(file);
    });
    showToast("上传成功，美好已挂载树梢");
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt) return;
    setIsAiLoading(true);
    try {
      const result = await generateGreeting(aiPrompt);
      setBlessing(result.replace(/\\n/g, '\n'));
      showToast("AI 已为您撰写了新的祝词");
      setAiPrompt('');
    } catch (err) {
      showToast("灵感枯竭了，请稍后再试");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleClear = () => {
    if (window.confirm("确定要清空所有记忆吗？")) {
      setPhotos([]);
      setBlessing('愿岁岁常欢愉，\n年年皆胜意。');
      localStorage.clear();
      showToast("记忆已归零");
    }
  };

  const handleClickScene = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isStarted) return;
