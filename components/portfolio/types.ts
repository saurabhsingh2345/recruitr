export interface PortfolioSkill { name: string; proofScore: number; evidence: string[] }
export interface PortfolioProject {
  title: string; description: string; techStack: string[]
  images: string[]; videoUrl: string; liveUrl: string; githubUrl: string
  featured: boolean; order: number
  // GitHub project fields (fallback)
  repoName?: string; githubUrl_?: string; stars?: number; language?: string
}
export interface PortfolioExperience { title: string; company: string; duration: string; location?: string }
export interface PortfolioEducation { institution: string; degree: string }
export interface SocialLink { platform: string; url: string }

export interface PortfolioData {
  user: { name: string; username: string; avatarUrl: string }
  profile: {
    bio: string; targetRole: string; location: string; yearsOfExperience: number
    cohortPercentile: number; parsedSkills: PortfolioSkill[]
    experiences: PortfolioExperience[]; educations: PortfolioEducation[]
    portfolioProjects: PortfolioProject[]
    portfolioCustomization: {
      customTitle?: string; accentColor?: string; socialLinks?: SocialLink[]
      showSkills?: boolean; showExperience?: boolean; showProjects?: boolean; showEducation?: boolean
    }
  }
}
