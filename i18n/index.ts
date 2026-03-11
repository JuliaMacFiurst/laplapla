import { ru } from "./ru";
import { he } from "./he";
import { en } from "./en";

export type Lang = "ru" | "he" | "en";

// Describe ONLY the SHAPE of the dictionary, not literal string values
type DictionaryShape = {
  home: {
    title: string;
    subtitle: string;
    sections: {
      cats: string;
      dogs: string;
      capybaras: string;
      parrots: string;
      raccoons: string;
      comingSoon: string;
    };
    cta: string;
  };

  about: {
    title: string;
    what: {
      title: string;
      preview: string;
      full: string;
    };
    forWho: {
      title: string;
      preview: string;
      full: string;
    };
    author: {
      title: string;
      preview: string;
      full: string;
      image?: "/images/about/my-photo.webp";
    };
    access: {
      title: string;
      preview: string;
      full: string;
    };
    language: {
      title: string;
      preview: string;
      full: string;
    };
    collaboration: {
      title: string;
      preview: string;
      full: string;
    };
  };

  video: {
    title: string;
    subtitle?: string;

    shortsTitle: string;
    videosTitle: string;

    searchPlaceholder: string;
    searchHint: string;

    emptyShorts: string;
    openVideo: string;
    backToList: string;

    categories: {
      science: string;
      nature: string;
      space: string;
      art: string;
      music: string;
      human: string;
      all: string;
      animals: string;
      math: string;
      physics: string;
      technology: string;
    };
  };

  cats: {
    title: string;
    subtitle: string;
    studioTab: string;
    studioSubtitle: string;
    backButton: string;

    examplesTitle: string;
    examples: {
      engine: string;
      passionarity: string;
      dreams: string;
    };

    inputPlaceholder: string;
    askButton: string;
    thinkingShort: string;
    thinkingLong: string;

    randomQuestion: string;
    editInStudio: string;

    errors: {
      generic: string;
      server: string;
      catsAiNotAvailable: string;
    };

    attribution: {
      gifsPoweredBy: string;
      videoProvidedBy: string;
    };

    studio: {
      addMedia: string;
      fill: string;
      fit: string;
      top: string;
      center: string;
      bottom: string;
      textColor: string;
      enableTextBg: string;
      disableTextBg: string;
      export: string;
      undo: string;
      redo: string;
      preview: string;
      deleteAll: string;
      confirmDeleteAll: string;
      textPlaceholder: string;
      confirmDeleteSlide: string;
      bgColor: string;
      media: string;
      position: string;
      text: string;
      actionsAndExport: string;
      alignLeft: string;
      alignCenter: string;
      alignRight: string;
      fontSize: string;
      closePreview: string;
      saved: string;

      // Audio / Music
      addMusic: string;
      recordVoice: string;
      improveVoice: string;
      stopRecording: string;
      currentTracks: string;
      activeTracks: string;
      noActiveTracks: string;
      voiceTrack: string;
      voiceDuration: string;
      sec: string;

      // Optional grouped audio namespace (if used as t.audio.*)
      audio: string;

      mediaPicker: {
        tabGiphy: string;
        tabPexels: string;
        tabUpload: string;
        searchPlaceholder: string;
        searchButton: string;
        loading: string;
        loadMore: string;

        giphyNoticeTitle: string;
        giphyRule1: string;
        giphyRule2: string;
        giphyTerms: string;

        pexelsNoticeTitle: string;
        pexelsRule1: string;
        pexelsRule2: string;
        pexelsRule3: string;

        uploadConfirm: string;
        uploadFormatsInfo: string;

        errorConfirmRights: string;
        errorSvgBlocked: string;
        errorUnsupported: string;
        errorImageTooLarge: string;
        errorVideoTooLarge: string;
        errorVideoTooLong: string;
        errorVideoMetadata: string;
      };
    };

    export: {
      videoReady: string;
      download: string;
      copyDescription: string;
      share: string;
      createAnother: string;
      record: string;
      recording: string;
      closeTutorial: string;
      howToSave: string;
      processing: string;
      remaining: string;
      seconds: string;
      preparing: string;
      recordingHint: string;
      tutorialTitle: string;
      tutorialText: string;
      shareDescription: string;
    };
  };

  dogs: {
    dogsPage: {
      title: string;
      subtitle: string;
      categories: {
        "cartoon-characters": string;
        kawaii: string;
        "nature-scenes": string;
        botanical: string;
        desserts: string;
        zodiac: string;
        faces: string;
        outfits: string;
        mandala: string;
        motion: string;
        dinosaurs: string;
        animals: string;
        memes: string;
        "anime-faces": string;
        hands: string;
        cityscapes: string;
      };
    };
    lessonsPage: {
      chooseLesson: string;
      startDrawing: string;
      noPreview: string;
    };
    dogLesson: {
      startLesson: string;
      repeatLesson: string;
      nextStep: string;

      start: string;

      stepOf: string;

      colorizeSketch: string;
      autoColorize: string;
      animatePicture: string;

      makePuzzle: string;
      paintFlow: string;
      mixPaints: string;
      replayProcess: string;

      comingSoon: string;

      frankName: string;
      fibiName: string;

      frankWelcome: string;
      prepareTools: string;

      frankChooseAction: string;

      frankPuzzle: string;

      frankFlowTouch: string;

      frankFlowDesktop: string;
      frankMix: string;

      frankReplay: string;

      frankColor: string;

      introVariants: {
        fibiIntroSecret: string;
        fibiIntroListen: string;
        fibiIntroTheySay: string;
        fibiIntroDidYouKnow: string;
        fibiIntroPsst: string;
        fibiIntroGuessWhat: string;
      };

      fibiArtistHint: string;
      openGallery: string;

      brush: string;
      eraser: string;

      undo: string;
      redo: string;
      clear: string;
      save: string;

      brushSize: string;
      brushColor: string;
      opacity: string;
      brushStyle: string;

      brushNormal: string;
      brushSparkle: string;
      brushRainbow: string;
      brushChameleon: string;
      brushGradient: string;
      brushNeon: string;
      brushWatercolor: string;

      confirmClear: string;

      restartConfirm: string;

      cancel: string;
      erase: string;

      loadingLesson: string;
    };
  };

  footer: {
    terms: string;
    privacy: string;
    licenses: string;
  };
};

export const ABOUT_SECTIONS = [
  "what",
  "forWho",
  "author",
  "access",
  "language",
  "collaboration",
] as const;

export type AboutSectionKey = (typeof ABOUT_SECTIONS)[number];

export const dictionaries: Record<Lang, DictionaryShape> = {
  ru: ru as DictionaryShape,
  he: he as DictionaryShape,
  en: en as DictionaryShape,
};
