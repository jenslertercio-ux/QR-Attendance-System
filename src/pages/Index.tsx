import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { QRScanner } from '@/components/QRScanner';
import { FileUploadScanner } from '@/components/FileUploadScanner';
import { parseQRCode, type StudentData } from '@/lib/qrCodeParser';
import { toast } from 'sonner';
import { 
  QrCode, Upload, Users, Calendar, CheckCircle, Trash2, Search, Edit, Save, X, 
  Download, FileSpreadsheet, Camera, ListChecks, Check, Sparkles, Zap, Clock, 
  Award, BarChart3, UserCheck, FileText, Filter, RefreshCw, Maximize, Minimize, 
  Activity, TrendingUp, Shield, Wifi, Battery, Settings, Bell, HelpCircle, 
  ChevronRight, ArrowUp, ArrowDown, MoreHorizontal, Star, AlertCircle, UserPlus,
  History, LogOut, Moon, Sun
} from 'lucide-react';
import QRCodeLib from 'qrcode';
import * as XLSX from 'xlsx';
import { triggerSuccessConfetti, triggerCelebrationConfetti } from '@/lib/confetti';
import { AttendanceListSkeleton, QRCodesSkeleton } from '@/components/SkeletonLoader';
import { EmptyState, EmptyAttendanceState, EmptyQRCodesState, EmptySearchState } from '@/components/EmptyState';
import { Header } from '@/components/Header';

// Types for better type safety
interface AttendanceRecord {
  studentId: string;
  studentName: string;
  section: string;
  date: string;
  time: string;
  timestamp: number;
}

interface RegisteredQRCode {
  id: string;
  name: string;
  section: string;
  rawData: string;
  registeredAt: string;
}

interface SystemStats {
  totalStudents: number;
  registeredQR: number;
  todayAttendance: number;
  weeklyTrend: number;
}

// Constants
const SECTIONS = ['WMAD 1-1', 'WMAD 1-2'];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const STORAGE_KEYS = {
  ATTENDANCE_DATA: 'attendanceData',
  REGISTERED_QR_CODES: 'registeredQRCodes',
  USER_PREFERENCES: 'userPreferences'
};

// Utility functions
const formatTime = (date: Date) => {
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: true 
  });
};

const formatDate = (date: Date) => {
  return date.toLocaleDateString();
};

const getCurrentDateTime = () => {
  const now = new Date();
  return {
    date: formatDate(now),
    time: formatTime(now),
    day: now.toLocaleDateString('en-US', { weekday: 'long' }),
    month: now.toLocaleDateString('en-US', { month: 'long' }),
    year: now.getFullYear(),
    timestamp: now.getTime()
  };
};

const generateAttendanceKey = (section: string, dateTime: ReturnType<typeof getCurrentDateTime>) => {
  return `${dateTime.year}_${dateTime.month}_${dateTime.day}_${section}`;
};

// Main component
const Index = () => {
  // State management
  const [attendanceData, setAttendanceData] = useState<{ [key: string]: AttendanceRecord[] }>({});
  const [registeredQRCodes, setRegisteredQRCodes] = useState<{ [key: string]: RegisteredQRCode }>({});
  const [currentSection, setCurrentSection] = useState('WMAD 1-1');
  const [currentRegistrationSection, setCurrentRegistrationSection] = useState('WMAD 1-1');
  const [isScanning, setIsScanning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(getCurrentDateTime());
  const [searchQuery, setSearchQuery] = useState('');
  const [registrationSearchQuery, setRegistrationSearchQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [lastScannedStudent, setLastScannedStudent] = useState<string | null>(null);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const [activeTab, setActiveTab] = useState('generator');
  const [darkMode, setDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // QR Generator state
  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [qrSection, setQrSection] = useState('WMAD 1-1');

  // Edit modal state
  const [editingQR, setEditingQR] = useState<RegisteredQRCode | null>(null);
  const [editForm, setEditForm] = useState({ id: '', name: '', section: '' });
  
  // Refs
  const scannerContainerRef = useRef<HTMLDivElement>(null);
  const toastIdRef = useRef<string | number | null>(null);

  // Initialize data on component mount
  useEffect(() => {
    loadAttendanceData();
    loadRegisteredQRCodes();
    loadUserPreferences();
    
    // Update current time every minute
    const timeInterval = setInterval(() => {
      setCurrentDateTime(getCurrentDateTime());
    }, 60000);
    
    return () => clearInterval(timeInterval);
  }, []);

  // Load data from localStorage
  const loadAttendanceData = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ATTENDANCE_DATA);
      if (stored) {
        setAttendanceData(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading attendance data:', error);
      toast.error('Failed to load attendance data');
    }
  }, []);

  const loadRegisteredQRCodes = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.REGISTERED_QR_CODES);
      if (stored) {
        const qrCodes = JSON.parse(stored);
        setRegisteredQRCodes(qrCodes);
        toast.success(`Loaded ${Object.keys(qrCodes).length} registered QR codes`);
      }
    } catch (error) {
      console.error('Error loading registered QR codes:', error);
      toast.error('Failed to load registered QR codes');
    }
  }, []);

  const loadUserPreferences = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
      if (stored) {
        const preferences = JSON.parse(stored);
        setDarkMode(preferences.darkMode || false);
        setShowStats(preferences.showStats !== false); // Default to true
      }
    } catch (error) {
      console.error('Error loading user preferences:', error);
    }
  }, []);

  // Save data to localStorage
  const saveAttendanceData = useCallback((data: { [key: string]: AttendanceRecord[] }) => {
    try {
      localStorage.setItem(STORAGE_KEYS.ATTENDANCE_DATA, JSON.stringify(data));
      setAttendanceData(data);
    } catch (error) {
      console.error('Error saving attendance data:', error);
      toast.error('Failed to save attendance data');
    }
  }, []);

  const saveRegisteredQRCodes = useCallback((data: { [key: string]: RegisteredQRCode }) => {
    try {
      localStorage.setItem(STORAGE_KEYS.REGISTERED_QR_CODES, JSON.stringify(data));
      setRegisteredQRCodes(data);
    } catch (error) {
      console.error('Error saving registered QR codes:', error);
      toast.error('Failed to save registered QR codes');
    }
  }, []);

  const saveUserPreferences = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify({
        darkMode,
        showStats
      }));
    } catch (error) {
      console.error('Error saving user preferences:', error);
    }
  }, [darkMode, showStats]);

  // Update user preferences when they change
  useEffect(() => {
    saveUserPreferences();
  }, [darkMode, showStats, saveUserPreferences]);

  // Add attendance record
  const addAttendanceRecord = useCallback((studentId: string, studentName: string, section: string): boolean => {
    const dateTime = getCurrentDateTime();
    const key = generateAttendanceKey(section, dateTime);

    const newData = { ...attendanceData };
    if (!newData[key]) {
      newData[key] = [];
    }

    // Check if student already marked attendance
    const alreadyMarked = newData[key].some(record => record.studentId === studentId);
    if (alreadyMarked) {
      return false;
    }

    const record: AttendanceRecord = {
      studentId,
      studentName,
      section,
      date: dateTime.date,
      time: dateTime.time,
      timestamp: dateTime.timestamp
    };

    newData[key].push(record);
    saveAttendanceData(newData);
    return true;
  }, [attendanceData, saveAttendanceData]);

  // Handle successful QR scan
  const handleScanSuccess = useCallback((decodedText: string) => {
    let studentData: StudentData | null = null;

    // Check if registered by exact match
    for (const id in registeredQRCodes) {
      if (registeredQRCodes[id].rawData === decodedText) {
        studentData = registeredQRCodes[id];
        break;
      }
    }

    // Try to parse if not found
    if (!studentData) {
      studentData = parseQRCode(decodedText, currentSection);
    }

    if (!studentData) {
      toast.error('Invalid QR code format');
      return;
    }

    // Check if registered by ID
    if (registeredQRCodes[studentData.id]) {
      studentData = registeredQRCodes[studentData.id];
    }

    // Automatic section switching
    if (studentData && studentData.section && currentSection !== studentData.section) {
      setCurrentSection(studentData.section);
      toast.info(`Automatically switched to ${studentData.section}`, {
        duration: 2000,
      });
    }

    const success = addAttendanceRecord(studentData.id, studentData.name, studentData.section);
    
    // Show success animation
    setLastScannedStudent(studentData.name);
    setShowSuccessAnimation(true);
    setTimeout(() => setShowSuccessAnimation(false), 3000);
    
    // Trigger confetti celebration
    if (success) {
      triggerSuccessConfetti();
    }
    
    // Show appropriate toast message
    if (success) {
      toast.success(`✓ Attendance marked for ${studentData.name}!`, {
        description: `Section: ${studentData.section}`,
        id: toastIdRef.current
      });
    } else {
      toast.warning(`${studentData.name} already marked attendance today`, {
        description: `Section: ${studentData.section}`,
        id: toastIdRef.current
      });
    }
  }, [registeredQRCodes, currentSection, addAttendanceRecord]);

  // Handle successful QR registration
  const handleRegistrationSuccess = useCallback((studentData: StudentData) => {
    setRegisteredQRCodes(prev => {
      const newRegistered = { ...prev };
      
      // Add or update the registration
      newRegistered[studentData.id] = {
        id: studentData.id,
        name: studentData.name,
        section: studentData.section,
        rawData: `${studentData.id}:${studentData.name}:${studentData.section}`,
        registeredAt: prev[studentData.id]?.registeredAt || new Date().toISOString(),
      };

      saveRegisteredQRCodes(newRegistered);
      return newRegistered;
    });
  }, [saveRegisteredQRCodes]);

  // Generate QR code
  const generateQRCode = useCallback(async () => {
    if (!studentId || !studentName) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsGenerating(true);
    const qrData = `${studentId}:${studentName}:${qrSection}`;
    
    try {
      const canvas = document.createElement('canvas');
      await QRCodeLib.toCanvas(canvas, qrData, {
        width: 300,
        margin: 2,
        color: {
          dark: '#FFFFFF',
          light: '#000000'
        }
      });

      const link = document.createElement('a');
      link.download = `QR_${studentId}_${studentName.replace(/\s+/g, '_')}.png`;
      link.href = canvas.toDataURL();
      link.click();

      // Trigger celebration
      triggerCelebrationConfetti();
      toast.success('QR code generated successfully!');
      setStudentId('');
      setStudentName('');
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast.error('Failed to generate QR code');
    } finally {
      setIsGenerating(false);
    }
  }, [studentId, studentName, qrSection]);

  // Get attendance for a specific day
  const getAttendanceForDay = useCallback((day: string) => {
    const key = `${currentDateTime.year}_${currentDateTime.month}_${day}_${currentSection}`;
    return (attendanceData[key] || []).filter(record => {
      if (!searchQuery) return true;
      return record.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
             record.studentId.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [attendanceData, currentDateTime, currentSection, searchQuery]);

  // Calculate system statistics
  const systemStats = useMemo((): SystemStats => {
    const totalStudents = new Set<string>();
    let weeklyTrend = 0;
    
    Object.values(attendanceData).forEach(records => {
      records.forEach(record => {
        totalStudents.add(record.studentId);
      });
    });

    // Calculate weekly trend (simplified)
    const today = new Date().getDay();
    const thisWeekCount = totalStudents.size;
    const lastWeekCount = Math.floor(thisWeekCount * 0.9); // Simplified calculation
    weeklyTrend = Math.round(((thisWeekCount - lastWeekCount) / lastWeekCount) * 100);

    return {
      totalStudents: totalStudents.size,
      registeredQR: Object.keys(registeredQRCodes).length,
      todayAttendance: getAttendanceForDay(currentDateTime.day).length,
      weeklyTrend
    };
  }, [attendanceData, registeredQRCodes, getAttendanceForDay, currentDateTime.day]);

  // Delete attendance record
  const deleteAttendanceRecord = useCallback((day: string, index: number) => {
    const key = `${currentDateTime.year}_${currentDateTime.month}_${day}_${currentSection}`;
    const newData = { ...attendanceData };
    if (newData[key]) {
      newData[key].splice(index, 1);
      saveAttendanceData(newData);
      toast.success('Record deleted');
    }
  }, [attendanceData, currentDateTime, currentSection, saveAttendanceData]);

  // Delete registered QR code
  const deleteRegisteredQR = useCallback((id: string) => {
    const newRegistered = { ...registeredQRCodes };
    delete newRegistered[id];
    saveRegisteredQRCodes(newRegistered);
    toast.success('QR code unregistered');
  }, [registeredQRCodes, saveRegisteredQRCodes]);

  // Edit QR code modal functions
  const openEditModal = useCallback((qr: RegisteredQRCode) => {
    setEditingQR(qr);
    setEditForm({ id: qr.id, name: qr.name, section: qr.section });
  }, []);

  const closeEditModal = useCallback(() => {
    setEditingQR(null);
    setEditForm({ id: '', name: '', section: '' });
  }, []);

  const saveEdit = useCallback(() => {
    if (!editingQR || !editForm.id || !editForm.name) {
      toast.error('Please fill in all required fields');
      return;
    }

    const newRegistered = { ...registeredQRCodes };
    
    // If ID changed, we need to delete the old key and create a new one
    if (editForm.id !== editingQR.id) {
      delete newRegistered[editingQR.id];
    }

    newRegistered[editForm.id] = {
      ...editingQR,
      id: editForm.id,
      name: editForm.name,
      section: editForm.section,
      rawData: `${editForm.id}:${editForm.name}:${editForm.section}`
    };

    saveRegisteredQRCodes(newRegistered);
    toast.success('QR code updated successfully');
    closeEditModal();
  }, [editingQR, editForm, registeredQRCodes, saveRegisteredQRCodes, closeEditModal]);

  // Get filtered registered QR codes
  const getFilteredRegisteredQRCodes = useCallback(() => {
    return Object.values(registeredQRCodes).filter(qr => {
      if (!registrationSearchQuery) return true;
      return qr.name.toLowerCase().includes(registrationSearchQuery.toLowerCase()) ||
             qr.id.toLowerCase().includes(registrationSearchQuery.toLowerCase()) ||
             qr.section.toLowerCase().includes(registrationSearchQuery.toLowerCase());
    });
  }, [registeredQRCodes, registrationSearchQuery]);

  // Export functions
  const exportToExcel = useCallback((day: string) => {
    setIsExporting(true);
    const records = getAttendanceForDay(day);
    
    if (records.length === 0) {
      toast.error('No attendance records to export');
      setIsExporting(false);
      return;
    }

    const excelData = records.map((record, index) => ({
      'No.': index + 1,
      'Student ID': record.studentId,
      'Student Name': record.studentName,
      'Section': record.section,
      'Date': record.date,
      'Time': record.time
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);
    ws['!cols'] = [{ wch: 5 }, { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, day);
    const filename = `Attendance_${day}_${currentDateTime.month}_${currentDateTime.year}_${currentSection}.xlsx`;
    XLSX.writeFile(wb, filename);
    toast.success(`Excel file downloaded: ${filename}`);
    setIsExporting(false);
  }, [getAttendanceForDay, currentDateTime, currentSection]);

  const exportAllDaysToExcel = useCallback(() => {
    setIsExporting(true);
    const wb = XLSX.utils.book_new();
    let hasData = false;

    DAYS.forEach(day => {
      const records = getAttendanceForDay(day);
      if (records.length > 0) {
        hasData = true;
        const excelData = records.map((record, index) => ({
          'No.': index + 1, 
          'Student ID': record.studentId, 
          'Student Name': record.studentName,
          'Section': record.section, 
          'Date': record.date, 
          'Time': record.time
        }));
        const ws = XLSX.utils.json_to_sheet(excelData);
        ws['!cols'] = [{ wch: 5 }, { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 12 }];
        XLSX.utils.book_append_sheet(wb, ws, day);
      }
    });

    if (!hasData) {
      toast.error('No attendance records to export');
      setIsExporting(false);
      return;
    }

    const filename = `Attendance_AllDays_${currentDateTime.month}_${currentDateTime.year}_${currentSection}.xlsx`;
    XLSX.writeFile(wb, filename);
    toast.success(`Excel file downloaded: ${filename}`);
    setIsExporting(false);
  }, [getAttendanceForDay, currentDateTime, currentSection]);

  const exportRegisteredQRCodes = useCallback(() => {
    setIsExporting(true);
    const qrCodes = getFilteredRegisteredQRCodes();
    
    if (qrCodes.length === 0) {
      toast.error('No registered QR codes to export');
      setIsExporting(false);
      return;
    }

    const excelData = qrCodes.map((qr, index) => ({
      'No.': index + 1, 
      'Student ID': qr.id, 
      'Student Name': qr.name,
      'Section': qr.section, 
      'Registered Date': new Date(qr.registeredAt).toLocaleString()
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);
    ws['!cols'] = [{ wch: 5 }, { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Registered QR Codes');
    const filename = `RegisteredQRCodes_${new Date().toLocaleDateString()}.xlsx`;
    XLSX.writeFile(wb, filename);
    toast.success(`Excel file downloaded: ${filename}`);
    setIsExporting(false);
  }, [getFilteredRegisteredQRCodes]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      scannerContainerRef.current?.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        toast.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(err => {
        toast.error(`Error attempting to exit fullscreen: ${err.message}`);
      });
    }
  }, []);

  // Handle fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header 
        userName="Admin User"
        userEmail="admin@qrattendance.com"
      />
      
      {/* Animated background elements */}
      <div className="bg-animation">
        <div className="bg-blob bg-blob-1"></div>
        <div className="bg-blob bg-blob-2"></div>
        <div className="bg-blob bg-blob-3"></div>
      </div>
      
      <div className="max-w-7xl mx-auto space-y-6 relative z-10 p-6">
        {/* Quick stats bar */}
        <div className="glass-nav rounded-3xl p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="glass-card rounded-2xl px-4 py-2 hover-lift">
                <p className="text-xs text-muted-foreground">Active Section</p>
                <p className="text-lg font-bold gradient-text">{currentSection}</p>
              </div>
              <div className="glass-card rounded-2xl px-4 py-2 hover-lift">
                <p className="text-xs text-muted-foreground">Current Date</p>
                <p className="text-lg font-bold text-foreground">{currentDateTime.date}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Success Animation Overlay */}
        {showSuccessAnimation && (
          <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none bg-background/80 backdrop-blur-sm">
            <div className="glass-card rounded-3xl p-8 animate-bounce-in shadow-2xl">
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center mb-4 animate-pulse shadow-lg">
                  <CheckCircle className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Attendance Marked!</h3>
                <p className="text-muted-foreground mt-2">{lastScannedStudent}</p>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Stats Cards with Toggle */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">Dashboard Overview</h2>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowStats(!showStats)}
            className="flex items-center gap-2"
          >
            {showStats ? <><ArrowUp className="w-4 h-4" /> Hide Stats</> : <><ArrowDown className="w-4 h-4" /> Show Stats</>}
          </Button>
        </div>
        
        {showStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="glass-card rounded-3xl p-6 hover-lift animate-fade-in-up relative overflow-hidden" style={{animationDelay: '0.1s'}}>
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary/20 to-transparent rounded-bl-full"></div>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
                  <Users className="w-7 h-7 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Total Students</p>
                  <p className="text-3xl font-bold text-foreground">{systemStats.totalStudents}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3 h-3 text-green-500" />
                    <p className="text-xs text-green-500">+{systemStats.weeklyTrend}% from last week</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-card rounded-3xl p-6 hover-lift animate-fade-in-up relative overflow-hidden" style={{animationDelay: '0.2s'}}>
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-accent/20 to-transparent rounded-bl-full"></div>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center shadow-lg">
                  <QrCode className="w-7 h-7 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Registered QR</p>
                  <p className="text-3xl font-bold text-foreground">{systemStats.registeredQR}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Activity className="w-3 h-3 text-blue-500" />
                    <p className="text-xs text-blue-500">Active registrations</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-card rounded-3xl p-6 hover-lift animate-fade-in-up relative overflow-hidden" style={{animationDelay: '0.3s'}}>
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-500/20 to-transparent rounded-bl-full"></div>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
                  <Calendar className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Today's Attendance</p>
                  <p className="text-3xl font-bold text-foreground">{systemStats.todayAttendance}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    <p className="text-xs text-green-500">On track</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-card rounded-3xl p-6 hover-lift animate-fade-in-up relative overflow-hidden" style={{animationDelay: '0.4s'}}>
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-yellow-500/20 to-transparent rounded-bl-full"></div>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center shadow-lg">
                  <Clock className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Current Time</p>
                  <p className="text-2xl font-bold text-foreground">
                    {currentDateTime.time}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <p className="text-xs text-green-500">System active</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Main Tabs */}
        <Tabs defaultValue="generator" className="space-y-6 animate-fade-in-up" onValueChange={setActiveTab}>
          <div className="glass-card rounded-3xl p-2">
            <TabsList className="grid w-full grid-cols-4 bg-transparent gap-2">
              <TabsTrigger value="generator" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-primary-foreground rounded-2xl transition-all duration-300 hover:scale-105 flex items-center gap-2">
                <QrCode className="w-4 h-4" />
                Generate QR
              </TabsTrigger>
              <TabsTrigger value="scanner" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-primary-foreground rounded-2xl transition-all duration-300 hover:scale-105 flex items-center gap-2">
                <Camera className="w-4 h-4" />
                Scan Attendance
              </TabsTrigger>
              <TabsTrigger value="register" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-primary-foreground rounded-2xl transition-all duration-300 hover:scale-105 flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Register QR
              </TabsTrigger>
              <TabsTrigger value="records" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-primary-foreground rounded-2xl transition-all duration-300 hover:scale-105 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                View Records
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Enhanced QR Generator */}
          <TabsContent value="generator" className="space-y-6 animate-fade-in">
            <div className="glass-card rounded-3xl p-8 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                  <QrCode className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">Generate QR Code</h3>
                  <p className="text-sm text-muted-foreground">Create new student QR codes with advanced options</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="studentId" className="text-sm font-medium text-foreground">Student ID</Label>
                  <Input 
                    id="studentId" 
                    value={studentId} 
                    onChange={(e) => setStudentId(e.target.value)} 
                    placeholder="Enter student ID" 
                    className="h-12 transition-all duration-300 focus:ring-2 focus:ring-primary/50" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="studentName" className="text-sm font-medium text-foreground">Student Name</Label>
                  <Input 
                    id="studentName" 
                    value={studentName} 
                    onChange={(e) => setStudentName(e.target.value)} 
                    placeholder="Enter student name" 
                    className="h-12 transition-all duration-300 focus:ring-2 focus:ring-primary/50" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qrSection" className="text-sm font-medium text-foreground">Section</Label>
                  <Select value={qrSection} onValueChange={setQrSection}>
                    <SelectTrigger id="qrSection" className="h-12 transition-all duration-300 focus:ring-2 focus:ring-primary/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass-card">
                      {SECTIONS.map(section => (
                        <SelectItem key={section} value={section}>{section}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={generateQRCode} 
                  disabled={isGenerating} 
                  className="w-full h-12 text-base font-medium bg-gradient-to-r from-primary to-accent hover:shadow-lg hover-glow transition-all duration-300 flex items-center gap-2"
                >
                  {isGenerating ? <><RefreshCw className="w-5 h-5 animate-spin" /> Generating...</> : <><Sparkles className="w-5 h-5" /> Generate QR Code</>}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Enhanced Scanner */}
          <TabsContent value="scanner" className="space-y-6 animate-fade-in">
            <div className="glass-card rounded-3xl p-8 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">QR Scanner</h3>
                    <p className="text-sm text-muted-foreground">Scan student QR codes for attendance</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-green-500/20 text-green-500 text-xs font-medium">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    {isScanning ? 'Active' : 'Inactive'}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={toggleFullscreen}
                    className="flex items-center gap-2"
                  >
                    {isFullscreen ? <><Minimize className="w-4 h-4" /> Exit Fullscreen</> : <><Maximize className="w-4 h-4" /> Fullscreen</>}
                  </Button>
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Section</Label>
                  <Select value={currentSection} onValueChange={setCurrentSection}>
                    <SelectTrigger className="h-12 transition-all duration-300 focus:ring-2 focus:ring-primary/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass-card">
                      {SECTIONS.map(section => (
                        <SelectItem key={section} value={section}>{section}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Scanner Container */}
                <div 
                  ref={scannerContainerRef}
                  className={`flex justify-center items-center ${isFullscreen ? 'w-full h-screen' : 'w-full'}`}
                >
                  <div className={`${isFullscreen ? 'w-full h-full' : 'w-full max-w-md'} relative`}>
                    {/* Main Scanner Container */}
                    <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-black shadow-2xl">
                      {/* Green Border Frame */}
                      <div className="absolute inset-0 border-4 border-green-500 rounded-2xl z-20 pointer-events-none shadow-lg"></div>
                      
                      {/* Corner Markers */}
                      <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-green-400 rounded-tl-2xl z-30 pointer-events-none animate-pulse"></div>
                      <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-green-400 rounded-tr-2xl z-30 pointer-events-none animate-pulse"></div>
                      <div className="absolute bottom-0 left-0 w-16 h-16 border-b-4 border-l-4 border-green-400 rounded-bl-2xl z-30 pointer-events-none animate-pulse"></div>
                      <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-green-400 rounded-br-2xl z-30 pointer-events-none animate-pulse"></div>
                      
                      {isScanning && (
                        <>
                          {/* Scanning Line Animation */}
                          <div className="absolute top-0 left-4 right-4 h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent animate-scan-line z-25"></div>
                          
                          {/* Center Scanning Area Indicator */}
                          <div className="absolute inset-0 flex items-center justify-center z-25">
                            <div className="w-56 h-56 border border-green-400/50 rounded-xl"></div>
                          </div>
                          
                          {/* Pulse Animation for Center */}
                          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 border-2 border-green-400/30 rounded-xl animate-pulse z-25"></div>
                          
                          {/* Pulse Ring Effect */}
                          <div className="pulse-ring z-25"></div>
                        </>
                      )}
                      
                      {/* QR Scanner Component */}
                      <div className="absolute inset-4 rounded-xl overflow-hidden z-10">
                        <div className="w-full h-full">
                          <QRScanner
                            onScanSuccess={handleScanSuccess}
                            isScanning={isScanning}
                            onToggleScanning={() => setIsScanning(!isScanning)}
                          />
                        </div>
                      </div>
                      
                      {/* Overlay when not scanning */}
                      {!isScanning && (
                        <div className="absolute inset-0 bg-black/70 flex items-center justify-center backdrop-blur-sm z-15">
                          <div className="text-center">
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4 animate-pulse shadow-lg">
                              <Camera className="w-10 h-10 text-white" />
                            </div>
                            <p className="text-white text-lg font-medium">Camera is off</p>
                            <p className="text-white/70 text-sm mt-2">Click the button below to start scanning</p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Enhanced Scanner Controls */}
                    <div className="mt-6 flex justify-center">
                      <Button 
                        onClick={() => setIsScanning(!isScanning)}
                        className={`w-full max-w-xs h-14 text-base font-medium transition-all duration-300 btn-scanner ${
                          isScanning 
                            ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700' 
                            : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                        }`}
                      >
                        {isScanning ? (
                          <>
                            <div className="w-5 h-5 rounded-full bg-white mr-2 animate-pulse"></div>
                            Stop Scanning
                          </>
                        ) : (
                          <>
                            <Zap className="w-5 h-5 mr-2" />
                            Start Scanning
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
                
                {isScanning && (
                  <div className="flex items-center justify-center gap-2 text-green-500 animate-pulse animate-float">
                    <Zap className="w-5 h-5" />
                    <p className="text-sm font-medium">Scanner is active - Point camera at QR code</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Enhanced Register QR */}
          <TabsContent value="register" className="space-y-6 animate-fade-in">
            <div className="glass-card rounded-3xl p-8 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center shadow-lg">
                  <Upload className="w-6 h-6 text-accent-foreground" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">Register QR Codes</h3>
                  <p className="text-sm text-muted-foreground">Upload and register QR codes from files</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Section</Label>
                  <Select value={currentRegistrationSection} onValueChange={setCurrentRegistrationSection}>
                    <SelectTrigger className="h-12 transition-all duration-300 focus:ring-2 focus:ring-primary/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass-card">
                      {SECTIONS.map(section => (
                        <SelectItem key={section} value={section}>{section}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <FileUploadScanner
                  onRegistrationSuccess={handleRegistrationSuccess}
                  currentSection={currentRegistrationSection}
                />
              </div>
            </div>

            {Object.keys(registeredQRCodes).length === 0 ? (
              <EmptyQRCodesState onAction={() => {}} />
            ) : (
              <div className="glass-card rounded-3xl p-8 mt-6 shadow-xl">
                <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center shadow-lg">
                      <ListChecks className="w-6 h-6 text-accent-foreground" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-foreground">Registered QR Codes ({Object.keys(registeredQRCodes).length})</h3>
                      <p className="text-sm text-muted-foreground">Manage registered students</p>
                    </div>
                  </div>
                  <Button 
                    onClick={exportRegisteredQRCodes} 
                    variant="outline" 
                    size="sm" 
                    className="flex items-center gap-2" 
                    disabled={isExporting}
                  >
                    {isExporting ? <><RefreshCw className="w-4 h-4 animate-spin" /> Exporting...</> : <><Download className="w-4 h-4" /> Export to Excel</>}
                  </Button>
                </div>
                <div className="space-y-4 mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input 
                      className="pl-11 h-12 transition-all duration-300 focus:ring-2 focus:ring-primary/50" 
                      placeholder="Search by name, ID, or section..." 
                      value={registrationSearchQuery} 
                      onChange={(e) => setRegistrationSearchQuery(e.target.value)} 
                    />
                  </div>
                </div>
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {getFilteredRegisteredQRCodes().length === 0 ? (
                    registrationSearchQuery ? (
                      <EmptySearchState />
                    ) : (
                      <EmptyQRCodesState onAction={() => setActiveTab('register')} />
                    )
                  ) : (
                    getFilteredRegisteredQRCodes().map((qr) => (
                      <div key={qr.id} className="glass-card p-4 rounded-2xl hover-lift transition-all duration-300">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4 flex-1">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold shadow-lg animate-scale-in">
                              {qr.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-lg text-foreground">{qr.name}</p>
                              <p className="text-sm text-muted-foreground">ID: {qr.id} • {qr.section}</p>
                              <p className="text-xs text-muted-foreground">Registered: {new Date(qr.registeredAt).toLocaleString()}</p>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => openEditModal(qr)}
                              className="hover:scale-110 transition-transform duration-200"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => deleteRegisteredQR(qr.id)}
                              className="hover:scale-110 transition-transform duration-200"
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Enhanced Records */}
          <TabsContent value="records" className="space-y-6 animate-fade-in">
            <div className="glass-card rounded-3xl p-8 shadow-xl">
              <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">Attendance Records</h3>
                    <p className="text-sm text-muted-foreground">View and export attendance history</p>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button 
                    onClick={() => exportToExcel(currentDateTime.day)} 
                    variant="outline" 
                    size="sm" 
                    className="flex items-center gap-2" 
                    disabled={isExporting}
                  >
                    {isExporting ? <><RefreshCw className="w-4 h-4 animate-spin" /> Exporting...</> : <><Download className="w-4 h-4" /> Export {currentDateTime.day}</>}
                  </Button>
                  <Button 
                    onClick={exportAllDaysToExcel} 
                    size="sm" 
                    className="bg-gradient-to-r from-green-500 to-green-600 hover:shadow-lg hover-glow flex items-center gap-2" 
                    disabled={isExporting}
                  >
                    {isExporting ? <><RefreshCw className="w-4 h-4 animate-spin" /> Exporting...</> : <><FileSpreadsheet className="w-4 h-4" /> Export All Days</>}
                  </Button>
                </div>
              </div>
              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">Section</Label>
                    <Select value={currentSection} onValueChange={setCurrentSection}>
                      <SelectTrigger className="h-12 transition-all duration-300 focus:ring-2 focus:ring-primary/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="glass-card">
                        {SECTIONS.map(section => (
                          <SelectItem key={section} value={section}>{section}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">Search</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input 
                        className="pl-11 h-12 transition-all duration-300 focus:ring-2 focus:ring-primary/50" 
                        placeholder="Search by name or ID..." 
                        value={searchQuery} 
                        onChange={(e) => setSearchQuery(e.target.value)} 
                      />
                    </div>
                  </div>
                </div>

                <Tabs value={currentDateTime.day} onValueChange={(value) => setCurrentDateTime(prev => ({ ...prev, day: value }))}>
                  <div className="glass-card rounded-2xl p-2 mb-4">
                    <TabsList className="grid w-full grid-cols-7 bg-transparent gap-1">
                      {DAYS.map(day => (
                        <TabsTrigger 
                          key={day} 
                          value={day} 
                          className="text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-green-600 data-[state=active]:text-white rounded-xl"
                        >
                          {day.slice(0, 3)}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>

                  {DAYS.map(day => (
                    <TabsContent key={day} value={day} className="space-y-3">
                      {getAttendanceForDay(day).length === 0 ? (
                        searchQuery ? (
                          <EmptySearchState />
                        ) : (
                          <EmptyAttendanceState onAction={() => setActiveTab('scanner')} />
                        )
                      ) : (
                        <div className="space-y-3">
                          {getAttendanceForDay(day).map((record, index) => (
                            <div key={index} className="glass-card p-4 rounded-2xl hover-lift transition-all duration-300 animate-fade-in" style={{ animationDelay: `${index * 0.05}s` }}>
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4 flex-1">
                                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-bold shadow-lg animate-scale-in">
                                    {record.studentName.split(' ').map(n => n[0]).join('').toUpperCase()}
                                  </div>
                                  <div className="flex-1">
                                    <p className="font-semibold text-lg text-foreground">{record.studentName}</p>
                                    <p className="text-sm text-muted-foreground">ID: {record.studentId} • {record.section}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="text-right">
                                    <p className="text-sm font-medium text-foreground">{record.date}</p>
                                    <p className="text-xs text-muted-foreground">{record.time}</p>
                                  </div>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => deleteAttendanceRecord(day, index)}
                                    className="hover:scale-110 transition-transform duration-200"
                                  >
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  ))}
                </Tabs>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Enhanced Edit QR Code Modal */}
      <Dialog open={editingQR !== null} onOpenChange={(open) => !open && closeEditModal()}>
        <DialogContent className="sm:max-w-[500px] glass-card shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                <Edit className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <DialogTitle className="text-xl">Edit Registered QR Code</DialogTitle>
                <DialogDescription>Update the student information</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-id" className="text-sm font-medium text-foreground">Student ID *</Label>
              <Input 
                id="edit-id" 
                value={editForm.id} 
                onChange={(e) => setEditForm({ ...editForm, id: e.target.value })} 
                placeholder="Enter student ID" 
                className="h-12 transition-all duration-300 focus:ring-2 focus:ring-primary/50" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-name" className="text-sm font-medium text-foreground">Student Name *</Label>
              <Input 
                id="edit-name" 
                value={editForm.name} 
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} 
                placeholder="Enter student name" 
                className="h-12 transition-all duration-300 focus:ring-2 focus:ring-primary/50" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-section" className="text-sm font-medium text-foreground">Section</Label>
              <Select value={editForm.section} onValueChange={(value) => setEditForm({ ...editForm, section: value })}>
                <SelectTrigger id="edit-section" className="h-12 transition-all duration-300 focus:ring-2 focus:ring-primary/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-card">
                  {SECTIONS.map(section => (
                    <SelectItem key={section} value={section}>{section}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeEditModal} className="flex items-center gap-2">
              <X className="w-4 h-4 mr-2" /> Cancel
            </Button>
            <Button onClick={saveEdit} className="bg-gradient-to-r from-primary to-accent hover:shadow-lg hover-glow flex items-center gap-2">
              <Save className="w-4 h-4 mr-2" /> Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;