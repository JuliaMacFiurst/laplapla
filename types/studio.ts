export type StudioSlide = {
  id: string
  text: string
  mediaUrl?: string
  bgColor: string
  textColor: string
}

export type StudioProject = {
  id: string
  slides: StudioSlide[]
  updatedAt: number
}