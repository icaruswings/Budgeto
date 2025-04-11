import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Fingerprint,
  Zap,
  Clock,
  Palette,
  Moon,
  Accessibility,
  ImagesIcon as Icons,
} from "lucide-react";

export function FeatureGrid() {
  const technologies = [
    {
      name: "Clerk",
      description: "Seamless authentication & user management",
      icon: <Fingerprint className="h-6 w-6" />,
      features: ["Multi-provider auth", "User profiles", "Session management"],
    },
    {
      name: "Convex",
      description: "Real-time database for instant data sync",
      icon: <Zap className="h-6 w-6" />,
      features: [
        "Real-time updates",
        "Automatic caching",
        "Serverless functions",
      ],
    },
    {
      name: "Inngest",
      description: "Powerful background job & workflow orchestration",
      icon: <Clock className="h-6 w-6" />,
      features: [
        "Job queues",
        "Workflow automation",
        "Event-driven architecture",
      ],
    },
    {
      name: "Tailwind CSS",
      description: "Utility-first CSS for rapid UI development",
      icon: <Palette className="h-6 w-6" />,
      features: ["Responsive design", "Custom theming", "Optimized builds"],
    },
    {
      name: "remix-themes",
      description: "Seamless light/dark mode integration",
      icon: <Moon className="h-6 w-6" />,
      features: [
        "Theme persistence",
        "System preference detection",
        "Smooth transitions",
      ],
    },
    {
      name: "shadcn/ui",
      description: "Beautifully designed, accessible components",
      icon: <Accessibility className="h-6 w-6" />,
      features: [
        "Customizable",
        "Keyboard navigation",
        "Screen reader friendly",
      ],
    },
    {
      name: "Lucide Icons",
      description: "Crisp, consistent iconography",
      icon: <Icons className="h-6 w-6" />,
      features: ["Extensive icon set", "Customizable", "Lightweight"],
    },
  ];

  return (
    <div className="container mx-auto py-12">
      <h2 className="text-3xl font-bold text-center mb-8">Modern tooling</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {technologies.map((tech) => (
          <Card key={tech.name} className="overflow-hidden">
            <CardHeader className="flex flex-row items-center gap-4 pb-2">
              <div className="bg-primary text-primary-foreground p-2 rounded-md">
                {tech.icon}
              </div>
              <div>
                <CardTitle className="text-xl">{tech.name}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm mb-4">
                {tech.description}
              </CardDescription>
              <div className="flex flex-wrap gap-2">
                {tech.features.map((feature) => (
                  <Badge key={feature} variant="secondary">
                    {feature}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
