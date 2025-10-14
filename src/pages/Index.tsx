import { useState, useEffect } from 'react';
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
import { QrCode, Upload, Users, Calendar, CheckCircle, Trash2, Search, Edit, Save, X } from 'lucide-react';
import QRCodeLib from 'qrcode';

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

const SECTIONS = ['WMAD 1-1', 'WMAD 1-2'];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const Index = () => {
  const [attendanceData, setAttendanceData] = useState<{ [key: string]: AttendanceRecord[] }>({});
  const [registeredQRCodes, setRegisteredQRCodes] = useState<{ [key: string]: RegisteredQRCode }>({});
  const [currentSection, setCurrentSection] = useState('WMAD 1-1');
  const [currentRegistrationSection, setCurrentRegistrationSection] = useState('WMAD 1-1');
  const [isScanning, setIsScanning] = useState(false);
  const [currentDay, setCurrentDay] = useState(new Date().toLocaleDateString('en-US', { weekday: 'long' }));
  const [currentMonth, setCurrentMonth] = useState(new Date().toLocaleDateString('en-US', { month: 'long' }));
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [searchQuery, setSearchQuery] = useState('');
  const [registrationSearchQuery, setRegistrationSearchQuery] = useState('');
  
  // QR Generator state
  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [qrSection, setQrSection] = useState('WMAD 1-1');

  // Edit modal state
  const [editingQR, setEditingQR] = useState<RegisteredQRCode | null>(null);
  const [editForm, setEditForm] = useState({ id: '', name: '', section: '' });

  useEffect(() => {
    loadAttendanceData();
    loadRegisteredQRCodes();
  }, []);

  const loadAttendanceData = () => {
    const stored = localStorage.getItem('attendanceData');
    if (stored) {
      setAttendanceData(JSON.parse(stored));
    }
  };

  const loadRegisteredQRCodes = () => {
    const stored = localStorage.getItem('registeredQRCodes');
    if (stored) {
      setRegisteredQRCodes(JSON.parse(stored));
      toast.success(`Loaded ${Object.keys(JSON.parse(stored)).length} registered QR codes`);
    }
  };

  const saveAttendanceData = (data: { [key: string]: AttendanceRecord[] }) => {
    localStorage.setItem('attendanceData', JSON.stringify(data));
    setAttendanceData(data);
  };

  const saveRegisteredQRCodes = (data: { [key: string]: RegisteredQRCode }) => {
    localStorage.setItem('registeredQRCodes', JSON.stringify(data));
    setRegisteredQRCodes(data);
  };

  const addAttendanceRecord = (studentId: string, studentName: string, section: string): boolean => {
    const now = new Date();
    const day = now.toLocaleDateString('en-US', { weekday: 'long' });
    const month = now.toLocaleDateString('en-US', { month: 'long' });
    const year = now.getFullYear();
    const key = `${year}_${month}_${day}_${section}`;

    const newData = { ...attendanceData };
    if (!newData[key]) {
      newData[key] = [];
    }

    const alreadyMarked = newData[key].some(record => record.studentId === studentId);
    if (alreadyMarked) {
      return false;
    }

    const record: AttendanceRecord = {
      studentId,
      studentName,
      section,
      date: now.toLocaleDateString(),
      time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      timestamp: now.getTime()
    };

    newData[key].push(record);
    saveAttendanceData(newData);
    return true;
  };

  const handleScanSuccess = (decodedText: string) => {
    let studentData: StudentData | null = null;

    // Check if registered
    for (const id in registeredQRCodes) {
      if (registeredQRCodes[id].rawData === decodedText) {
        studentData = registeredQRCodes[id];
        break;
      }
    }

    // Try to parse
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

    const success = addAttendanceRecord(studentData.id, studentData.name, studentData.section);
    if (success) {
      toast.success(`Attendance marked for ${studentData.name}!`);
    } else {
      toast.warning(`${studentData.name} already marked attendance today`);
    }
  };

  const handleRegistrationSuccess = (studentData: StudentData) => {
    if (registeredQRCodes[studentData.id]) {
      toast.warning(`${studentData.name} is already registered`);
      return;
    }

    const newRegistered = { ...registeredQRCodes };
    newRegistered[studentData.id] = {
      id: studentData.id,
      name: studentData.name,
      section: studentData.section,
      rawData: `${studentData.id}:${studentData.name}:${studentData.section}`,
      registeredAt: new Date().toISOString()
    };

    saveRegisteredQRCodes(newRegistered);
    toast.success(`Registered: ${studentData.name}`);
  };

  const generateQRCode = async () => {
    if (!studentId || !studentName) {
      toast.error('Please fill in all fields');
      return;
    }

    const qrData = `${studentId}:${studentName}:${qrSection}`;
    
    try {
      const canvas = document.createElement('canvas');
      await QRCodeLib.toCanvas(canvas, qrData, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      const link = document.createElement('a');
      link.download = `QR_${studentId}_${studentName.replace(/\s+/g, '_')}.png`;
      link.href = canvas.toDataURL();
      link.click();

      toast.success('QR code generated successfully!');
      setStudentId('');
      setStudentName('');
    } catch (error) {
      toast.error('Failed to generate QR code');
    }
  };

  const getAttendanceForDay = (day: string) => {
    const key = `${currentYear}_${currentMonth}_${day}_${currentSection}`;
    return (attendanceData[key] || []).filter(record => {
      if (!searchQuery) return true;
      return record.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
             record.studentId.toLowerCase().includes(searchQuery.toLowerCase());
    });
  };

  const getTotalStudents = () => {
    const students = new Set<string>();
    Object.values(attendanceData).forEach(records => {
      records.forEach(record => students.add(record.studentId));
    });
    return students.size;
  };

  const deleteAttendanceRecord = (day: string, index: number) => {
    const key = `${currentYear}_${currentMonth}_${day}_${currentSection}`;
    const newData = { ...attendanceData };
    if (newData[key]) {
      newData[key].splice(index, 1);
      saveAttendanceData(newData);
      toast.success('Record deleted');
    }
  };

  const deleteRegisteredQR = (id: string) => {
    const newRegistered = { ...registeredQRCodes };
    delete newRegistered[id];
    saveRegisteredQRCodes(newRegistered);
    toast.success('QR code unregistered');
  };

  const openEditModal = (qr: RegisteredQRCode) => {
    setEditingQR(qr);
    setEditForm({ id: qr.id, name: qr.name, section: qr.section });
  };

  const closeEditModal = () => {
    setEditingQR(null);
    setEditForm({ id: '', name: '', section: '' });
  };

  const saveEdit = () => {
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
  };

  const getFilteredRegisteredQRCodes = () => {
    return Object.values(registeredQRCodes).filter(qr => {
      if (!registrationSearchQuery) return true;
      return qr.name.toLowerCase().includes(registrationSearchQuery.toLowerCase()) ||
             qr.id.toLowerCase().includes(registrationSearchQuery.toLowerCase()) ||
             qr.section.toLowerCase().includes(registrationSearchQuery.toLowerCase());
    });
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-glow mb-4 shadow-glow">
            <QrCode className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            QR Attendance System
          </h1>
          <p className="text-muted-foreground">Modern attendance tracking with QR code technology</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-border shadow-elegant">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4" />
                Total Students
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{getTotalStudents()}</div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-elegant">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <QrCode className="w-4 h-4" />
                Registered QR Codes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{Object.keys(registeredQRCodes).length}</div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-elegant">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Current Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="generator" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-card">
            <TabsTrigger value="generator">Generate QR</TabsTrigger>
            <TabsTrigger value="scanner">Scan Attendance</TabsTrigger>
            <TabsTrigger value="register">Register QR</TabsTrigger>
            <TabsTrigger value="records">View Records</TabsTrigger>
          </TabsList>

          {/* QR Generator */}
          <TabsContent value="generator" className="space-y-6">
            <Card className="border-border shadow-elegant">
              <CardHeader>
                <CardTitle>Generate QR Code</CardTitle>
                <CardDescription>Create QR codes for students</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="studentId">Student ID</Label>
                  <Input
                    id="studentId"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="Enter student ID"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="studentName">Student Name</Label>
                  <Input
                    id="studentName"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="Enter student name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qrSection">Section</Label>
                  <Select value={qrSection} onValueChange={setQrSection}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SECTIONS.map(section => (
                        <SelectItem key={section} value={section}>{section}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={generateQRCode} className="w-full">
                  <QrCode className="w-4 h-4 mr-2" />
                  Generate QR Code
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Scanner */}
          <TabsContent value="scanner" className="space-y-6">
            <Card className="border-border shadow-elegant">
              <CardHeader>
                <CardTitle>Scan QR Code</CardTitle>
                <CardDescription>Scan student QR codes to mark attendance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Section</Label>
                  <Select value={currentSection} onValueChange={setCurrentSection}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SECTIONS.map(section => (
                        <SelectItem key={section} value={section}>{section}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <QRScanner
                  onScanSuccess={handleScanSuccess}
                  isScanning={isScanning}
                  onToggleScanning={() => setIsScanning(!isScanning)}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Register QR */}
          <TabsContent value="register" className="space-y-6">
            <Card className="border-border shadow-elegant">
              <CardHeader>
                <CardTitle>Register QR Codes</CardTitle>
                <CardDescription>Upload and register QR codes from files</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Section</Label>
                  <Select value={currentRegistrationSection} onValueChange={setCurrentRegistrationSection}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
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
              </CardContent>
            </Card>

            {Object.keys(registeredQRCodes).length > 0 && (
              <Card className="border-border shadow-elegant">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Registered QR Codes ({Object.keys(registeredQRCodes).length})</span>
                  </CardTitle>
                  <div className="space-y-2 mt-4">
                    <Label>Search</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input
                        className="pl-9"
                        placeholder="Search by name, ID, or section..."
                        value={registrationSearchQuery}
                        onChange={(e) => setRegistrationSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {getFilteredRegisteredQRCodes().length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No registered QR codes found matching "{registrationSearchQuery}"</p>
                      </div>
                    ) : (
                      getFilteredRegisteredQRCodes().map((qr) => (
                        <div key={qr.id} className="flex items-center justify-between p-4 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground font-bold text-lg">
                              {qr.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-lg">{qr.name}</p>
                              <p className="text-sm text-muted-foreground">
                                ID: {qr.id} • {qr.section}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Registered: {new Date(qr.registeredAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditModal(qr)}
                              title="Edit QR Code"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteRegisteredQR(qr.id)}
                              title="Delete QR Code"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Records */}
          <TabsContent value="records" className="space-y-6">
            <Card className="border-border shadow-elegant">
              <CardHeader>
                <CardTitle>Attendance Records</CardTitle>
                <CardDescription>View attendance history</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Section</Label>
                    <Select value={currentSection} onValueChange={setCurrentSection}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SECTIONS.map(section => (
                          <SelectItem key={section} value={section}>{section}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Search</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input
                        className="pl-9"
                        placeholder="Search by name or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <Tabs value={currentDay} onValueChange={setCurrentDay}>
                  <TabsList className="grid w-full grid-cols-7 bg-card">
                    {DAYS.map(day => (
                      <TabsTrigger key={day} value={day} className="text-xs">
                        {day.slice(0, 3)}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {DAYS.map(day => (
                    <TabsContent key={day} value={day} className="space-y-2">
                      {getAttendanceForDay(day).length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>No attendance records for {day}</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {getAttendanceForDay(day).map((record, index) => (
                            <div key={index} className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold">
                                  {record.studentName.split(' ').map(n => n[0]).join('').toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-semibold">{record.studentName}</p>
                                  <p className="text-sm text-muted-foreground">
                                    ID: {record.studentId} • {record.section}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <p className="text-sm">{record.date}</p>
                                  <p className="text-xs text-muted-foreground">{record.time}</p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteAttendanceRecord(day, index)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit QR Code Modal */}
      <Dialog open={editingQR !== null} onOpenChange={(open) => !open && closeEditModal()}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Registered QR Code</DialogTitle>
            <DialogDescription>
              Update the student information for this registered QR code
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-id">Student ID *</Label>
              <Input
                id="edit-id"
                value={editForm.id}
                onChange={(e) => setEditForm({ ...editForm, id: e.target.value })}
                placeholder="Enter student ID"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-name">Student Name *</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Enter student name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-section">Section</Label>
              <Select value={editForm.section} onValueChange={(value) => setEditForm({ ...editForm, section: value })}>
                <SelectTrigger id="edit-section">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SECTIONS.map(section => (
                    <SelectItem key={section} value={section}>{section}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeEditModal}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={saveEdit}>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
