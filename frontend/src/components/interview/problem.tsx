import { BookOpen, Code2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { exercise } from "@/lib/exercise";

export function Problem() {
  return (
    <section className="panel problem-panel" aria-label="Problem description">
      <div className="panel-heading">
        <BookOpen aria-hidden="true" />
        <span>Problem</span>
        <span className="heading-meta">01</span>
      </div>
      <div className="problem-body">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">Python</Badge>
          <Badge variant="outline">
            Original exercise · v{exercise.exercise_version}
          </Badge>
        </div>
        <h1>{exercise.title}</h1>
        <p>{exercise.statement}</p>
        <Tabs defaultValue="examples">
          <TabsList variant="line">
            <TabsTrigger value="examples">Examples</TabsTrigger>
            <TabsTrigger value="requirements">Requirements</TabsTrigger>
          </TabsList>
          <TabsContent value="examples">
            <div className="examples">
              {exercise.examples.map((example, index) => (
                <div className="example" key={index}>
                  <h2>Example {index + 1}</h2>
                  <dl>
                    <dt>Input</dt>
                    <dd>
                      <code>{JSON.stringify(example.input)}</code>
                    </dd>
                    <dt>Output</dt>
                    <dd>
                      <code>{JSON.stringify(example.output)}</code>
                    </dd>
                  </dl>
                  <p>{example.explanation}</p>
                </div>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="requirements">
            <ul className="requirement-list">
              {exercise.requirements.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </TabsContent>
        </Tabs>
        <div className="constraints">
          <h2>
            <Code2 aria-hidden="true" /> Constraints
          </h2>
          <ul>
            {exercise.constraints.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
