import { Anthropic, Grok, OpenAI, DeepSeek, OpenClaw, HermesAgent } from "@lobehub/icons";
import OpenCodeReview from "../../assets/opencodereview.svg";
import type { CSSProperties, ReactNode } from "react";
import PicoClaw from "../../assets/picoclaw.png";
import Nanobot from "../../assets/nanobot.png";
import Aider from "../../assets/aider.png";
import { cn } from "@/lib/utils";

export interface ProviderAvatarProps {
  size?: number;
  shape?: "circle" | "square";
  className?: string;
  style?: CSSProperties;
  iconScale?: number;
}

interface AvatarShellProps extends ProviderAvatarProps {
  iconScale?: number;
  children: (iconSize: number) => ReactNode;
}

function AvatarShell({ size = 32, className, children }: AvatarShellProps) {
  return (
    <div className={cn("w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4",className)}>
      {children(size)}
    </div>
  );
}
export function OpenAIAvatar({ iconScale = 0.75, ...props }: ProviderAvatarProps) {
  return (
    <AvatarShell iconScale={iconScale} {...props}>
      {(iconSize) => (
        <OpenAI size={iconSize} style={{ transform: `scale(${iconScale})` }} />
      )}
    </AvatarShell>
  );
}

export function HermesAgentAvatar({ iconScale = 0.75, ...props }: ProviderAvatarProps) {
  return (
    <AvatarShell iconScale={iconScale} {...props}>
      {(iconSize) => (
        <HermesAgent size={iconSize} style={{ transform: `scale(${iconScale})` }} />
      )}
    </AvatarShell>
  );
}
export function AnthropicAvatar({ iconScale = 0.75, ...props }: ProviderAvatarProps) {
  return (
    <AvatarShell iconScale={iconScale} {...props}>
      {(iconSize) => (
        <Anthropic size={iconSize} style={{ transform: `scale(${iconScale})` }} />
      )}
    </AvatarShell>
  );
}

export function GrokAvatar({ iconScale = 0.8, ...props }: ProviderAvatarProps) {
  return (
    <AvatarShell iconScale={iconScale} {...props}>
      {(iconSize) => (
        <Grok size={iconSize} style={{ transform: `scale(${iconScale})` }} />
      )}
    </AvatarShell>
  );
}

export function DeepSeekAvatar({ iconScale = 0.9, ...props }: ProviderAvatarProps) {
  return (
    <AvatarShell iconScale={iconScale} {...props}>
      {(iconSize) => (
        <DeepSeek size={iconSize} style={{ transform: `scale(${iconScale})` }} className="text-blue-700"/>
      )}
    </AvatarShell>
  );
}


export function OpenClawAvatar({ iconScale = 0.9, ...props }: ProviderAvatarProps) {
  return (
    <AvatarShell iconScale={iconScale} {...props}>
      {(iconSize) => (
        <OpenClaw size={iconSize} style={{ transform: `scale(${iconScale})` }} className="text-red-600"/>
      )}
    </AvatarShell>
  );
}

export function ProviderAvatar({provider, ...props }: 
  ProviderAvatarProps & { provider: string }) {
  switch (provider) {
    case "openai":
    case "codex":
      return <OpenAIAvatar {...props} />;

    case "anthropic":
    case "claude":
      return <AnthropicAvatar {...props} />;
    case "deepseek":
    case "codewhale":
        return <DeepSeekAvatar {...props} />;
    case "grok":
      return <GrokAvatar {...props} />;
    case "openclaw":
      return <OpenClawAvatar {...props} />;
    case "hermes-agent":
    case "hermes":
      return <HermesAgentAvatar {...props} />;
    case "aider":
      return <img src={Aider} alt="Aider" className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4" />;
    case "picoclaw":
      return <img src={PicoClaw} alt="PicoClaw" className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4" />;
    case "nanobot":
      return <img src={Nanobot} alt="Nanobot" className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4" />;
    case "opencodereview":
      return <img src={OpenCodeReview} alt="OpenCodeReview" className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4" />;
    default:
      return <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
        <span className="material-symbols-outlined text-primary">
          terminal
        </span>
      </div>
  }
}