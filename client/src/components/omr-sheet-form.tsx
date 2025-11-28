import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Atom, FlaskConical, Leaf, Save, Check, X, BookOpen } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { SubjectData, QuestionStatus } from "@shared/schema";

// Week 1 chapters configuration
const CHAPTERS_CONFIG = {
  physics: [
    "Electrostatics",
    "Capacitance",
    "Current electricity",
    "Elasticity",
  ],
  chemistry: [
    "p block",
    "Coordination compounds",
  ],
  biology: [
    "Human health and diseases",
    "Microbes",
    "Biotechnology:PP",
    "Biotech: Applications",
    "Tissue culture",
    "The living world",
  ],
};

const MAX_QUESTIONS = 200;

function createEmptySubjectData(chapterNames: string[]): SubjectData {
  const chapters: Record<string, { practiced: number }> = {};
  chapterNames.forEach(chapter => {
    chapters[chapter] = { practiced: 0 };
  });
  return {
    present: 0,
    chapters,
    questions: Array.from({ length: 8 }, () => ({ done: false, practiced: false })),
  };
}

interface QuestionCardProps {
  questionNumber: number;
  status: QuestionStatus;
  onChange: (status: QuestionStatus) => void;
  subjectColor: string;
}

function QuestionCard({ questionNumber, status, onChange, subjectColor }: QuestionCardProps) {
  return (
    <div className="p-4 rounded-md border border-border bg-card hover-elevate">
      <div className="flex items-center justify-between mb-3">
        <Badge 
          variant="outline" 
          className="font-medium"
          style={{ 
            borderColor: `hsl(${subjectColor})`,
            color: `hsl(${subjectColor})`,
          }}
        >
          Q{questionNumber}
        </Badge>
        {status.done && (
          <Badge 
            variant="secondary" 
            className="text-xs"
            style={{ 
              backgroundColor: status.practiced ? 'hsl(var(--chemistry))' : 'hsl(var(--muted))',
              color: status.practiced ? 'hsl(var(--chemistry-foreground))' : 'hsl(var(--muted-foreground))'
            }}
          >
            {status.practiced ? "Practiced" : "Not Practiced"}
          </Badge>
        )}
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor={`done-${questionNumber}`} className="text-sm flex items-center gap-2">
            {status.done ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <X className="w-4 h-4 text-muted-foreground" />
            )}
            Done
          </Label>
          <Switch
            id={`done-${questionNumber}`}
            checked={status.done}
            onCheckedChange={(done) => onChange({ ...status, done, practiced: done ? status.practiced : false })}
            data-testid={`switch-done-${questionNumber}`}
          />
        </div>
        
        {status.done && (
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <Label htmlFor={`practiced-${questionNumber}`} className="text-sm flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-muted-foreground" />
              Practiced
            </Label>
            <Switch
              id={`practiced-${questionNumber}`}
              checked={status.practiced}
              onCheckedChange={(practiced) => onChange({ ...status, practiced })}
              data-testid={`switch-practiced-${questionNumber}`}
            />
          </div>
        )}
      </div>
    </div>
  );
}

interface ChapterInputProps {
  chapterName: string;
  practiced: number;
  onChange: (practiced: number) => void;
  subjectColor: string;
}

function ChapterInput({ chapterName, practiced, onChange, subjectColor }: ChapterInputProps) {
  return (
    <div className="p-4 rounded-md border border-border bg-card hover-elevate">
      <div className="flex items-center justify-between mb-3">
        <Badge 
          variant="outline" 
          className="font-medium"
          style={{ 
            borderColor: `hsl(${subjectColor})`,
            color: `hsl(${subjectColor})`,
          }}
        >
          {chapterName}
        </Badge>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Label htmlFor={`chapter-practiced-${chapterName}`} className="text-sm">
            Practiced:
          </Label>
          <Input
            id={`chapter-practiced-${chapterName}`}
            type="number"
            min="0"
            max="999"
            value={practiced}
            onChange={(e) => onChange(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-24"
            data-testid={`input-chapter-practiced-${chapterName}`}
          />
        </div>
      </div>
    </div>
  );
}

interface SubjectSectionProps {
  title: string;
  icon: typeof Atom;
  colorVar: string;
  data: SubjectData;
  onChange: (data: SubjectData) => void;
  chapters: string[];
}

function SubjectSection({ title, icon: Icon, colorVar, data, onChange, chapters }: SubjectSectionProps) {
  const doneCount = data.questions.filter(q => q.done).length;
  const practicedCount = data.questions.filter(q => q.practiced).length;
  const totalChaptersPracticed = Object.values(data.chapters).reduce((sum, ch) => sum + ch.practiced, 0);
  
  const updateQuestion = (index: number, status: QuestionStatus) => {
    const newQuestions = [...data.questions];
    newQuestions[index] = status;
    onChange({ ...data, questions: newQuestions });
  };

  const updateChapter = (chapterName: string, practiced: number) => {
    const newData = {
      ...data,
      chapters: {
        ...data.chapters,
        [chapterName]: { practiced },
      },
    };
    onChange(newData);
  };

  return (
    <Card className="overflow-visible">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-md flex items-center justify-center"
              style={{ backgroundColor: `hsl(${colorVar})` }}
            >
              <Icon className="w-5 h-5" style={{ color: `hsl(${colorVar.replace(/\d+%$/, '98%')})` }} />
            </div>
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Done: <span className="font-semibold">{doneCount}</span> | 
                Practiced: <span className="font-semibold">{practicedCount}</span> | 
                Chapters Practiced: <span className="font-semibold">{totalChaptersPracticed}</span>
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Present Questions Field */}
        <div className="border-b pb-4">
          <Label htmlFor={`present-${title}`} className="text-sm font-medium">
            Number of Questions Present
          </Label>
          <Input
            id={`present-${title}`}
            type="number"
            min="0"
            max={MAX_QUESTIONS}
            value={data.present}
            onChange={(e) => onChange({ ...data, present: Math.max(0, parseInt(e.target.value) || 0) })}
            className="mt-2"
            placeholder="Enter total questions present"
            data-testid={`input-present-${title}`}
          />
        </div>

        {/* Chapters Section */}
        <div>
          <h4 className="font-medium text-sm mb-4">Chapters - Questions Practiced</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {chapters.map((chapter) => (
              <ChapterInput
                key={chapter}
                chapterName={chapter}
                practiced={data.chapters[chapter]?.practiced || 0}
                onChange={(practiced) => updateChapter(chapter, practiced)}
                subjectColor={colorVar}
              />
            ))}
          </div>
        </div>

        {/* Questions Section */}
        <div>
          <h4 className="font-medium text-sm mb-4">Questions - Done & Practiced Status</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.questions.map((status, index) => (
              <QuestionCard
                key={index}
                questionNumber={index + 1}
                status={status}
                onChange={(newStatus) => updateQuestion(index, newStatus)}
                subjectColor={colorVar}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface OMRSheetFormProps {
  onSubmitSuccess?: () => void;
}

export default function OMRSheetForm({ onSubmitSuccess }: OMRSheetFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    physics: createEmptySubjectData(CHAPTERS_CONFIG.physics),
    chemistry: createEmptySubjectData(CHAPTERS_CONFIG.chemistry),
    biology: createEmptySubjectData(CHAPTERS_CONFIG.biology),
  });

  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("POST", "/api/omr-sheets", data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-sheets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
      setFormData({
        name: "",
        physics: createEmptySubjectData(CHAPTERS_CONFIG.physics),
        chemistry: createEmptySubjectData(CHAPTERS_CONFIG.chemistry),
        biology: createEmptySubjectData(CHAPTERS_CONFIG.biology),
      });
      toast({
        title: "Success",
        description: "OMR sheet submitted successfully!",
      });
      onSubmitSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit OMR sheet",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a sheet name",
        variant: "destructive",
      });
      return;
    }
    mutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create OMR Sheet</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="sheet-name">Sheet Name</Label>
              <Input
                id="sheet-name"
                placeholder="e.g., Week 1 Practice"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                data-testid="input-sheet-name"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <SubjectSection
          title="Physics"
          icon={Atom}
          colorVar="var(--physics)"
          data={formData.physics}
          onChange={(physics) => setFormData({ ...formData, physics })}
          chapters={CHAPTERS_CONFIG.physics}
        />

        <SubjectSection
          title="Chemistry"
          icon={FlaskConical}
          colorVar="var(--chemistry)"
          data={formData.chemistry}
          onChange={(chemistry) => setFormData({ ...formData, chemistry })}
          chapters={CHAPTERS_CONFIG.chemistry}
        />

        <SubjectSection
          title="Biology"
          icon={Leaf}
          colorVar="var(--biology)"
          data={formData.biology}
          onChange={(biology) => setFormData({ ...formData, biology })}
          chapters={CHAPTERS_CONFIG.biology}
        />
      </div>

      <Button 
        type="submit" 
        className="w-full"
        disabled={mutation.isPending}
        data-testid="button-submit"
      >
        <Save className="w-4 h-4 mr-2" />
        {mutation.isPending ? "Submitting..." : "Submit OMR Sheet"}
      </Button>
    </form>
  );
}
