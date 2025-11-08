import { FileX, Inbox, QrCode, UserX, Calendar, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReactNode } from 'react';

interface EmptyStateProps {
  type: 'attendance' | 'qr-codes' | 'no-data' | 'search';
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: ReactNode;
}

const iconMap = {
  attendance: Calendar,
  'qr-codes': QrCode,
  'no-data': Inbox,
  search: FileX,
};

export const EmptyState = ({ 
  type, 
  title, 
  description, 
  action,
  icon 
}: EmptyStateProps) => {
  const IconComponent = iconMap[type];
  
  const defaultTitles = {
    attendance: 'No Attendance Records',
    'qr-codes': 'No QR Codes Registered',
    'no-data': 'No Data Available',
    search: 'No Results Found',
  };

  const defaultDescriptions = {
    attendance: 'Start scanning QR codes to mark attendance for students.',
    'qr-codes': 'Register QR codes by uploading images or scanning them directly.',
    'no-data': 'There is no data to display at the moment.',
    search: 'Try adjusting your search query or filters.',
  };

  return (
    <div className="glass-card rounded-3xl p-12 text-center animate-fade-in">
      <div className="flex flex-col items-center max-w-md mx-auto">
        {/* Animated Icon Container */}
        <div className="relative mb-6 animate-bounce-in">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-xl animate-pulse"></div>
          <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center border-2 border-dashed border-primary/30">
            {icon ? icon : <IconComponent className="w-12 h-12 text-muted-foreground" />}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-2xl font-bold text-foreground mb-2">
          {title || defaultTitles[type]}
        </h3>

        {/* Description */}
        <p className="text-muted-foreground mb-6 max-w-sm">
          {description || defaultDescriptions[type]}
        </p>

        {/* Action Button */}
        {action && (
          <Button
            onClick={action.onClick}
            className="bg-gradient-to-r from-primary to-accent hover:shadow-lg hover-glow transition-all duration-300 flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {action.label}
          </Button>
        )}

        {/* Decorative Elements */}
        <div className="mt-8 flex items-center gap-2 opacity-30">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    </div>
  );
};

export const EmptyAttendanceState = ({ onAction }: { onAction?: () => void }) => (
  <EmptyState
    type="attendance"
    action={onAction ? { label: 'Start Scanning', onClick: onAction } : undefined}
  />
);

export const EmptyQRCodesState = ({ onAction }: { onAction?: () => void }) => (
  <EmptyState
    type="qr-codes"
    action={onAction ? { label: 'Register QR Codes', onClick: onAction } : undefined}
  />
);

export const EmptySearchState = () => (
  <EmptyState type="search" />
);
