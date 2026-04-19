import { ru } from "./ru";
import { he } from "./he";
import { en } from "./en";

export type Lang = "ru" | "he" | "en";

// Describe ONLY the SHAPE of the dictionary, not literal string values
type DictionaryShape = {
  seo: {
    home: {
      title: string;
      description: string;
    };
    cats: {
      index: {
        title: string;
        description: string;
      };
      studio: {
        title: string;
        description: string;
      };
      export: {
        title: string;
        description: string;
      };
    };
    dogs: {
      index: {
        title: string;
        description: string;
      };
      lessons: {
        titleSuffix: string;
        defaultTitle: string;
        description: string;
      };
      lesson: {
        titleSuffix: string;
        defaultTitle: string;
        defaultDescription: string;
      };
    };
    parrots: {
      title: string;
      description: string;
    };
    capybaras: {
      index: {
        title: string;
        description: string;
      };
      createStory: {
        title: string;
        description: string;
      };
      book: {
        titleSuffix: string;
        defaultDescription: string;
        modeDescription: string;
      };
    };
    raccoons: {
      index: {
        title: string;
        description: string;
      };
      quest1: {
        title: string;
        description: string;
      };
      map: {
        countryTitleSuffix: string;
        animalTitleSuffix: string;
        riverTitleSuffix: string;
        seaTitleSuffix: string;
        biomeTitleSuffix: string;
        descriptionSuffix: string;
      };
    };
    about: {
      index: {
        title: string;
        description: string;
      };
      section: {
        titleSuffix: string;
        defaultDescription: string;
      };
    };
    legal: {
      terms: {
        title: string;
        description: string;
      };
      privacy: {
        title: string;
        description: string;
      };
      licenses: {
        title: string;
        description: string;
      };
    };
    adminLogin: {
      title: string;
      description: string;
    };
  };

  home: {
    title: string;
    subtitle: string;
    mobileHelper: string;
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
    mobileSectionTitle: string;
    mobileSectionSubtitle: string;
    mobilePopularTitle: string;
    mobileViewerHint: string;
    closeViewer: string;

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
    thinkingLongWithQuestion: string;

    randomQuestion: string;
    editInStudio: string;
    findNewImage: string;
    mobileIntroTitle: string;
    mobileIntroText: string;
    swipeHint: string;

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
      makeLouder: string;
      childVoice: string;
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
    artGalleryModal: {
      artGalleryTitle: string;
    };
  };

  parrots: {
    page: {
      headTitle: string;
      title: string;
      subtitle: string;
    };
    story: {
      fallbackSilent: string;
      externalPrompt: string;
      aboutArtist: string;
      aboutStyle: string;
      openSlideshowWithMusic: string;
      findNewImage: string;
    };
    mixer: {
      titlePlay: string;
      titleStop: string;
      loading: string;
      volume: string;
      recordVoice: string;
      stopRecording: string;
      micVolume: string;
      voiceVolume: string;
      micLabel: string;
      voiceLabel: string;
      monitorLabel: string;
      monitorTitle: string;
      myRecording: string;
      recordingReady: string;
      listenRecording: string;
      deleteRecording: string;
      deleteConfirm: string;
      saveMix: string;
      previousVariant: string;
      nextVariant: string;
      randomVariant: string;
      startOfList: string;
      endOfList: string;
      layerLabel: string;
      layerOn: string;
      layerOff: string;
      variantCounter: string;
      variantListLabel: string;
      chooseVariant: string;
      defaultHint: string;
      imageAlt: string;
      layerNames: Record<string, string>;
      reactions: {
        on: string[];
        off: string[];
        next: string[];
        random: string[];
        tryVariant: string;
        readySing: string;
        micFailed: string;
        countdown3: string;
        countdown2: string;
        countdown1: string;
        recordingStopped: string;
        flightMix: string;
        selectLayerFirst: string;
        stopRest: string;
        enableLayerFirst: string;
        savingMix: string;
        savedTrack: string;
        saveError: string;
        recordingDeleted: string;
      };
    };
  };

  capybaras: {
    capybaraPage: {
      title: string;
      subtitle: string;
      feedKicker: string;
      scrollHint: string;
      navigation: {
        previousBook: string;
        nextBook: string;
        previousSlide: string;
        nextSlide: string;
      };
      search: {
        title: string;
        placeholder: string;
        button: string;
        clear: string;
        backToFeed: string;
        noResults: string;
        searchError: string;
      };
      loadingErrorTitle: string;
      storyError: string;
      slideCounter: string;
      testTitle: string;
      noTests: string;
      untitledQuestion: string;
      quiz: {
        unavailable: string;
        questionCounter: string;
        correct: string;
        incorrect: string;
        close: string;
        nextQuestion: string;
        showResults: string;
        tryAgain: string;
        resultSummary: string;
        results: {
          perfect: string;
          twoWrong: string;
          needsRetry: string;
        };
      };
      actions: {
        randomBook: string;
        explainMeaning: string;
        takeTest: string;
        createVideo: string;
        createStory: string;
        findNewImage: string;
        openCatsStudio: string;
      };
      errors: {
        invalidParams: string;
        explanationLoad: string;
        explanationGeneric: string;
        testsLoad: string;
        randomBookLoad: string;
        noModes: string;
        noExplanations: string;
        bookLoad: string;
        errorTitle: string;
        errorHint: string;
      };
      fallbackSlides: {
        unknownBookTitle: string;
        line1: string;
        line2: string;
        line3: string;
        line4: string;
      };
    };
  };

  raccoons: {
    page: {
      headTitle: string;
      metaDescription: string;
      title: string;
      subtitle: string;
      guideAlt: string;
      slidesTranslationNotice?: string;
    };
    tabs: {
      country: string;
      river: string;
      sea: string;
      physic: string;
      flag: string;
      animal: string;
      culture: string;
      weather: string;
      food: string;
    };
    quests: {
      title: string;
      subtitle: string;
      playQuest: string;
      previousQuest: string;
      nextQuest: string;
      featuredTitle: string;
      featuredSubtitle: string;
      upcomingTitle: string;
      upcomingSubtitle: string;
    };
    popup: {
      previousStoryInProgress: string;
      noSlidesForEditor: string;
      noVideo: string;
      noGoogleMaps: string;
      close: string;
      flagAlt: string;
      videoLabel: string;
      closeVideo: string;
      videoFrameTitle: string;
      slideMediaAlt: string;
      slideEmpty: string;
      watchVideo: string;
      openCatsEditor: string;
      openGoogleMaps: string;
      contentNotReady: string;
      loading: string;
      initialPrompt: string;
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
  ru: ru as unknown as DictionaryShape,
  he: he as unknown as DictionaryShape,
  en: en as unknown as DictionaryShape,
};
