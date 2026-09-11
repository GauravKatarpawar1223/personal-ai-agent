import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import {
  HowItWorks,
  CapabilitiesHonesty,
  LandingFooter,
} from "@/components/landing/HowItWorks";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <Header />
      <Hero />
      <HowItWorks />
      <CapabilitiesHonesty />
      <LandingFooter />
    </main>
  );
}
