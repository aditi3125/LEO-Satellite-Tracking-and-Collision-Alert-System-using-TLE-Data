import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Satellite, Trash2, Eye } from "lucide-react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SatelliteCardProps {
  satellite: {
    id: string;
    name: string;
    tle_line1: string;
    tle_line2: string;
    created_at: string;
  };
  onDelete?: (id: string) => void;
  onView?: (id: string) => void;
}

export const SatelliteCard = ({ satellite, onDelete, onView }: SatelliteCardProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDelete = () => {
    if (onDelete) {
      onDelete(satellite.id);
    }
    setShowDeleteDialog(false);
  };

  return (
    <>
      <Card className="p-5 bg-card/60 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-all group hover:shadow-[0_0_30px_rgba(96,165,250,0.2)]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="p-2 bg-primary/20 rounded-lg group-hover:bg-primary/30 transition-colors">
              <Satellite className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground text-lg mb-1 truncate">
                {satellite.name}
              </h3>
              <p className="text-xs text-muted-foreground mb-2">
                Added: {new Date(satellite.created_at).toLocaleString()}
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs border-primary/40 text-primary">
                  TLE Data Available
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {onView && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onView(satellite.id)}
                className="hover:bg-primary/10 hover:text-primary"
              >
                <Eye className="w-4 h-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowDeleteDialog(true)}
                className="hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-card border-destructive/30">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Satellite</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{satellite.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
