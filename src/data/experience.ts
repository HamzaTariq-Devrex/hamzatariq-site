export type Job = {
  role: string;
  company: string;
  period: string;
  current: boolean;
  body: string;
  tags: string[];
};

export const JOBS: Job[] = [
  {
    role: "Founder & Web Developer",
    company: "Devrex Digital",
    period: "2024 - Present",
    current: true,
    body: "Founded Devrex Digital, a creative web development agency built around delivering premium, fully custom websites. Successfully partnered with 45+ brands, startups, and businesses across diverse industries. Every project was crafted around the client's unique brand identity: from custom theme design and UI/UX to SEO optimization, lead generation, sales strategy, and complete web management. Helping businesses not just launch online, but grow.",
    tags: ["Custom Themes", "UI/UX", "SEO", "Lead Generation", "Sales Strategy", "Web Management"],
  },
  {
    role: "Junior Frontend Web Developer",
    company: "Ruya Solutions",
    period: "2023 - 2024",
    current: false,
    body: "Began my professional journey building real-world client websites as a Junior Frontend Developer. Worked on multiple projects using React.js, crafting responsive and visually clean interfaces. Collaborated closely with design teams to turn concepts into pixel-perfect, fully functional web experiences.",
    tags: ["React.js", "Responsive UI", "Design Collaboration"],
  },
];

export const EDUCATION = "BSc in Artificial Intelligence";
