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
import type { QuestionStatus, SubjectData } from "@shared/schema";

const QUESTIONS_PER_SUBJECT = 8;

function createEmptySubjectData(): SubjectData {
  return {
    questions: Array.from({ length: QUESTIONS_PER_SUBJECT }, () => ({
      done: false,
      practiced: false,
    })),
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

interface SubjectSectionProps {
  title: string;
  icon: typeof Atom;
  colorVar: string;
  data: SubjectData;
  onChange: (data: SubjectData) => void;
  subjectKey: string;
}

function SubjectSection({ title, icon: Icon, colorVar, data, onChange, subjectKey }: SubjectSectionProps) {
  const doneCount = data.questions.filter(q => q.done).length;
  const practicedCount = data.questions.filter(q => q.practiced).length;
  
  const updateQuestion = (index: number, status: QuestionStatus) => {
    const newQuestions = [...data.questions];
    newQuestions[index] = status;
    onChange({ questions: newQuestions });
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
            <CardTitle className="text-xl">{title}</CardTitle>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-xs">
              {doneCount}/8 Done
            </Badge>
            <Badge 
              variant="secondary" 
              className="text-xs"
              style={{ 
                backgroundColor: practicedCount > 0 ? 'hsl(var(--chemistry) / 0.15)' : undefined,
                color: practicedCount > 0 ? 'hsl(var(--chemistry))' : undefined
              }}
            >
              {practicedCount} Practiced
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {data.questions.map((question, index) => (
            <QuestionCard
              key={`${subjectKey}-${index}`}
              questionNumber={index + 1}
              status={question}
              onChange={(status) => updateQuestion(index, status)}
              subjectColor={colorVar}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface OMRSheetFormProps {
  onSuccess?: () => void;
}

export default function OMRSheetForm({ onSuccess }: OMRSheetFormProps) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [physics, setPhysics] = useState<SubjectData>(createEmptySubjectData());
  const [chemistry, setChemistry] = useState<SubjectData>(createEmptySubjectData());
  const [biology, setBiology] = useState<SubjectData>(createEmptySubjectData());

  const submitMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/omr-sheets", {
        name,
        physics,
        chemistry,
        biology,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "OMR sheet submitted successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/omr-sheets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
      setName("");
      setPhysics(createEmptySubjectData());
      setChemistry(createEmptySubjectData());
      setBiology(createEmptySubjectData());
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit OMR sheet",
        variant: "destructive",
      });
    },
  });

  const totalDone = 
    physics.questions.filter(q => q.done).length +
    chemistry.questions.filter(q => q.done).length +
    biology.questions.filter(q => q.done).length;

  const totalPracticed = 
    physics.questions.filter(q => q.practiced).length +
    chemistry.questions.filter(q => q.practiced).length +
    biology.questions.filter(q => q.practiced).length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a name for this sheet",
        variant: "destructive",
      });
      return;
    }
    submitMutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <Label htmlFor="sheet-name" className="text-sm font-medium mb-2 block">
                Sheet Name
              </Label>
              <Input
                id="sheet-name"
                placeholder="e.g., Daily Practice - Day 1"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full"
                data-testid="input-sheet-name"
              />
            </div>
            <div className="flex gap-3 flex-shrink-0">
              <Badge variant="outline" className="px-3 py-2">
                {totalDone}/24 Done
              </Badge>
              <Badge 
                variant="secondary" 
                className="px-3 py-2"
                style={{ 
                  backgroundColor: totalPracticed > 0 ? 'hsl(var(--chemistry) / 0.15)' : undefined,
                  color: totalPracticed > 0 ? 'hsl(var(--chemistry))' : undefined
                }}
              >
                {totalPracticed} Practiced
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <SubjectSection
        title="Physics"
        icon={Atom}
        colorVar="var(--physics)"
        data={physics}
        onChange={setPhysics}
        subjectKey="physics"
      />

      <SubjectSection
        title="Chemistry"
        icon={FlaskConical}
        colorVar="var(--chemistry)"
        data={chemistry}
        onChange={setChemistry}
        subjectKey="chemistry"
      />

      <SubjectSection
        title="Biology"
        icon={Leaf}
        colorVar="var(--biology)"
        data={biology}
        onChange={setBiology}
        subjectKey="biology"
      />

      <div className="flex justify-center">
        <Button 
          type="submit" 
          size="lg" 
          disabled={submitMutation.isPending}
          className="px-8"
          data-testid="button-submit-sheet"
        >
          <Save className="w-4 h-4 mr-2" />
          {submitMutation.isPending ? "Submitting..." : "Submit OMR Sheet"}
        </Button>
      </div>
    </form>
  );
}
