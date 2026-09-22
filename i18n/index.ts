import { ru } from "./ru";
import { he } from "./he";
import { en } from "./en";
import { isolateMixedBidiTree } from "@/lib/i18n/bidi";

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
    author: {
      title: string;
      description: string;
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
    bedtimeStories: {
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
      appLab: string;
    };
    brand: {
      eyebrow: string;
      heading: string;
      intro: string;
      audience: string;
      sectionsTitle: string;
      aboutLink: string;
    };
    cta: string;
    installBanner: string;
  };

  homeRetention: {
    title: string;
    recipe: string;
    dogs: string;
    bedtime: string;
    mobileTitle: string;
    empty: string;
    recipeBadge: string;
    lessonBadge: string;
    openRecipe: string;
    openLesson: string;
    openBedtimeStory: string;
    bedtimeSoon: string;
    recipeArchive: string;
    drawingArchive: string;
    bedtimeArchive: string;
  };

  bedtimeStories: {
    kicker: string;
    title: string;
    subtitle: string;
    readStory: string;
    close: string;
    previous: string;
    next: string;
    counter: string;
    empty: string;
    backHome: string;
  };

  pwaInstall: {
    seo: {
      title: string;
      description: string;
    };
    banner: {
      ariaLabel: string;
      title: string;
      text: string;
      iosTitle: string;
      iosText: string;
      installButton: string;
      instructionsButton: string;
      dismissLabel: string;
    };
    page: {
      kicker: string;
      title: string;
      lead: string;
      installButton: string;
      unavailableButton: string;
      installedNote: string;
      cards: {
        android: {
          title: string;
          summary: string;
          steps: string[];
        };
        ios: {
          title: string;
          summary: string;
          steps: string[];
        };
        mac: {
          title: string;
          summary: string;
          steps: string[];
        };
        windows: {
          title: string;
          summary: string;
          steps: string[];
        };
      };
    };
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
    editorial: {
      title: string;
      preview: string;
      full: string;
    };
  };

  identity: {
    authorPage: {
      hero: {
        eyebrow: string;
        title: string;
        body: string[];
        appLabCta: string;
        contactCta: string;
      };
      platformTitle: string;
      platformIntro: string;
      platformItems: string[];
      platformOutro: string;
      whyTitle: string;
      whyIntro: string;
      whyItems: string[];
      whyOutro: string;
      collaborationTitle: string;
      collaborationParagraphs: string[];
      profilesTitle: string;
      github: string;
      linkedin: string;
      youtube: string;
      authorshipTitle: string;
      authorshipParagraphs: string[];
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
    mobilePlayer: {
      loading: string;
      failed: string;
      openYouTube: string;
      play: string;
      pause: string;
      soundOn: string;
      soundOff: string;
    };

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
    categoriesTitle: string;
    clearCategories: string;
    categorySelectionLabel: string;
    subcategorySelectionLabel: string;
    changeCategory: string;
    questionsTitle: string;
    subcategoriesTitle: string;
    closeSubcategories: string;
    categoryResultsCount: string;
    loadMoreQuestions: string;
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
        title: string;
        tabAll: string;
        tabGif: string;
        tabMemeImages: string;
        tabReactions: string;
        tabVideos: string;
        tabGiphy: string;
        tabPexels: string;
        tabStickers: string;
        tabUpload: string;
        searchPlaceholder: string;
        stickerSearchPlaceholder: string;
        searchButton: string;
        loading: string;
        loadMore: string;
        stickerNotice: string;

        unifiedNoticeTitle: string;
        unifiedRule1: string;
        unifiedRule2: string;
        providerTermsPrefix: string;
        providerTermsSuffix: string;
        giphyTermsPrefix: string;
        giphyTermsSuffix: string;

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
        errorMissingQuery: string;
        errorSearchFailed: string;
        errorTrendingFailed: string;
      };
      stickers?: string;
      addSticker?: string;
      opacity?: string;
      exportSheet: {
        idle: string;
        idleWorks: string;
        browserProcessing: string;
        keepOpen: string;
        startExport: string;
        saveToPhone: string;
        preparingMedia: string;
        preparingVideoOnly: string;
        recordingSlide: string;
        finalizingMp4: string;
        convertingMp4: string;
        ready: string;
        exportedWithoutSound: string;
        share: string;
        save: string;
        copyCaption: string;
        copyCredits: string;
        captionTemplate: string;
        creditsText: string;
        copiedCaption: string;
        copiedCredits: string;
        copyFailed: string;
        shareOpened: string;
        shareUnavailable: string;
        shareCancelled: string;
        fallbackTitle: string;
        fallbackInstructions: string;
        localScreenRecording: string;
        privacyNote: string;
        beforeStart: string;
        guidedStepSave: string;
        guidedStepRecord: string;
        guidedStepPlay: string;
        guidedStepClose: string;
        fullscreenHint: string;
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
      drawingTools: string;
      thin: string;
      thick: string;
      resetZoom: string;
      brightness: string;
      artistAdvice: string;
      chooseColor: string;
      closeArtistAdvice: string;
      closeColorMenu: string;
      currentColor: string;
      white: string;
      black: string;
      howToPlay: string;
      closeManual: string;
      manualTitle: string;
      manualLead: string;
      manualDrawTitle: string;
      manualDrawText: string;
      manualColorTitle: string;
      manualColorText: string;
      manualPuzzleTitle: string;
      manualPuzzleText: string;
      manualSaveTitle: string;
      manualSaveText: string;
      manualDone: string;
    };
    artGalleryModal: {
      artGalleryTitle: string;
      loadingGallery: string;
      swipeHint: string;
      findNewImage: string;
      editInCats: string;
      closeGallery: string;
      moreArtists: string;
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
      openSlides: string;
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
        filtersTitle: string;
        clearFilters: string;
        age: string;
        genre: string;
        backToFeed: string;
        noResults: string;
        searchError: string;
      };
      loadingErrorTitle: string;
      storyLoading: string;
      storyEmpty: string;
      storyError: string;
      storyRetry: string;
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
    onboarding: {
      close: string;
      reopen: string;
      stepLabel: string;
      steps: readonly [
        { title: string; body: string },
        { title: string; body: string },
        { title: string; body: string },
      ];
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
      showOnMap: string;
      watchOnYoutube: string;
      openTextPage: string;
      openTextPageLoading: string;
      openCatsEditor: string;
      openGoogleMaps: string;
      contentNotReady: string;
      loading: string;
      initialPrompt: string;
    };
  };

  topBar: {
    signIn: string;
  };

  shop: {
    navTitle: string;
    hubTitle: string;
    hubDescription: string;
    comingSoonTitle: string;
    comingSoonText: string;
    exploreFreeContent: string;
    buy: string;
    free: string;

    interest: {
      title: string;
      intro: string;
      formats: string;
      manifesto: string;
      examples: { from: string; to: string }[];
    };

    conceptCards: {
      solve: { title: string; desc: string };
      create: { title: string; desc: string };
      explore: { title: string; desc: string };
      together: { title: string; desc: string };
    };

    howItWorks: {
      title: string;
      step1: string;
      step2: string;
      step3: string;
    };
    tryNow: string;
    freeQuest: string;
    questDestination: string;
    seeStore: string;
    catalogTitle: string;
    catalogIntro: string;
    prototypeBadge: string;

    soundCase: {
      eyebrow: string;
      title: string;
      subtitle: string;
      description: string;
      highlights: string[];
      createCta: string;
      preparationNote: string;
      builder: {
        title: string;
        intro: string;
        languageLabel: string;
        leadLabel: string;
        leadPlaceholder: string;
        leadRequired: string;
        participantsLabel: string;
        participantPlaceholder: string;
        addParticipant: string;
        removeParticipant: string;
        participantLimit: string;
      };
      preview: {
        eyebrow: string;
        personalizedForPrefix: string;
        namePlaceholder: string;
        teamHeading: string;
        includedTitle: string;
        includedItems: string[];
        howItWorksTitle: string;
        howItWorksSteps: string[];
        requirementsTitle: string;
        requirements: string[];
        preparationLabel: string;
        preparationTime: string;
        playLabel: string;
        playTime: string;
        adventureMapTitle: string;
        adventureStages: string[];
        buyAction: string;
        buyUnavailable: string;
      };
      caseCover: {
        kicker: string;
        printLabTitle: string;
        printLabGuidance: string;
        leadHeading: string;
        teamHeading: string;
        participantsEmpty: string;
        namePlaceholder: string;
        dossierIntroPrefix: string;
        dossierIntroSuffix: string;
        dossierStatuses: Array<{
          label: string;
          value: string;
        }>;
        assignment: string;
        parrotLabel: string;
        parrotGreeting: string;
        parrotLines: string[];
        parrotCallout: string;
        gameHeading: string;
        gameFlow: string;
        gameRules: [string, string, string, string];
        groupNotes: [string, string];
        transition: string;
        caseNumber: string;
      };
      introCard: {
        storyLines: readonly [string, string, string, string, string];
      };
      soundCards: {
        footerInstruction: string;
        titles: {
          ketchup: string;
          sneezeCat: string;
          snortingLaugh: string;
          tinyAngryDog: string;
          selfScaredSnore: string;
          hiccupHorse: string;
          singingRooster: string;
          operaLego: string;
          bassSeagull: string;
          evilGoat: string;
          throatSinging: string;
          rakeAsphalt: string;
        };
        modifiers: {
          reverse: string;
          "nose-pinched": string;
          "hand-megaphone": string;
        };
      };
      soundCardBacks: {
        printHelpTitle: string;
        frontTopEdge: string;
        frontSideLabel: string;
        sheetLabel: string;
        backSide: string;
        notNewSheet: string;
        frontLabel: string;
        backLabel: string;
        autoTitle: string;
        autoPrintPrefix: string;
        autoPrintSuffix: string;
        autoSettingsLabel: string;
        autoSettings: readonly [string, string, string, string, string];
        autoResult: string;
        manualTitle: string;
        manualIntro: string;
        stepLabel: string;
        pageLabel: string;
        manualPrintOnly: string;
        manualSameSheet: string;
        manualAlreadyMarked: string;
        manualReinsertWithTest: string;
        manualRepeat: string;
        feedWarning: string;
        testTitle: string;
        testIntro: string;
        testSteps: readonly [string, string, string, string, string];
        testCheckLabel: string;
        testChecks: readonly [string, string];
        testResult: string;
      };
      cardBox: {
        title: string;
        stageNumber: string;
        legendLabel: string;
        cutLabel: string;
        foldLabel: string;
        svgAlt: string;
        assemblyTitle: string;
        assemblySteps: readonly [string, string, string, string];
        printNote: string;
        printLabGuidance: string;
      };
      stage02: {
        title: string;
        stageLabel: string;
        intro: {
          parrotLabel: string;
          speech: readonly [string, string, string, string];
          challenge: string;
          task: string;
        };
        clue: {
          title: string;
          backWarning: readonly [string, string, string];
          cta: string;
          qrAccessLabel: string;
        };
        box: {
          title: string;
          rulesHeading: string;
          rules: readonly [string, string, string, string, string, string, string];
          warning: string;
          legendLabel: string;
          cutLabel: string;
          foldLabel: string;
          svgAlt: string;
          assemblyTitle: string;
          assemblySteps: readonly [string, string, string, string];
          printNote: string;
        };
        printHelp: {
          title: string;
          summary: string;
          duplexTitle: string;
          duplexSteps: readonly [string, string, string];
          singleTitle: string;
          singleSteps: readonly [string, string];
          actualSize: string;
        };
      };
      unknownSoundCard: {
        title: string;
        numberPrefix: string;
        qrAccessLabel: string;
        listenAction: string;
        question: string;
        evidenceLines: readonly [string, string, string];
        actionLines: readonly [string, string, string];
      };
      unknownSoundScene: {
        pageTitle: string;
        metaDescription: string;
        stageLabel: string;
        title: string;
        numberPrefix: string;
        parrotLabel: string;
        arrivalLines: readonly [string, string, string, string, string];
        playAction: string;
        pauseAction: string;
        resumeAction: string;
        replayAction: string;
        loadingAction: string;
        progressLabel: string;
        audioError: string;
        retryAction: string;
        guessQuestion: string;
        guessInstruction: string;
        guessOptions: {
          animal: string;
          machine: string;
          instrument: string;
          "natural-phenomenon": string;
          "no-idea": string;
        };
        confirmGuess: string;
        guessRecordedTitle: string;
        guessRecordedBody: string;
        clueAction: string;
        evidenceLabel: string;
        clueTitle: string;
        clueLines: readonly [string, string, string];
        parrotAfterClueLines: readonly [string, string, string, string, string];
        leadNameSuffix: string;
        leadFallback: string;
        investigateFurther: string;
        finalTitle: string;
        finalBody: string;
        helpAriaLabel: string;
        helpTitle: string;
        helpBrandPrefix: string;
        helpBrandSuffix: string;
        helpLines: readonly [string, string];
        helpClose: string;
      };
      stage02ClueScene: {
        pageTitle: string;
        metaDescription: string;
        stageLabel: string;
        heading: string;
        parrotLabel: string;
        speech: readonly string[];
        equalizerAction: string;
        adultBonusTitle: string;
        adultBonusQuestion: string;
        adultBonusExplanation: string;
      };
      humanEqualizer: {
        pageTitle: string;
        metaDescription: string;
        stageLabel: string;
        title: string;
        modeQuestion: string;
        parrotIntroLines: readonly string[];
        parrotModeTitle: string;
        parrotModeDescription: string;
        hostModeTitle: string;
        hostModeDescription: string;
        instructionsTitle: string;
        instructionsHint: string;
        listeningHelp: string;
        previewAction: string;
        tempoTitle: string;
        tempoCalmTitle: string;
        tempoCalmDescription: string;
        tempoFastTitle: string;
        tempoFastDescription: string;
        mistakeHint: string;
        startAction: string;
        countdownLabel: string;
        countdownStart: string;
        countdownVoice: { 3: string; 2: string; 1: string; start: string };
        listenAction: string;
        gameControlsLabel: string;
        backAction: string;
        pauseAction: string;
        pausedTitle: string;
        resumeAction: string;
        exitQuestion: string;
        continueGameAction: string;
        exitAction: string;
        roundTitles: readonly [string, string, string];
        brokenMessage: string;
        hostPrompt: string;
        parrotPrompt: string;
        faderLabel: string;
        signalLabels: { low: string; mid: string; high: string };
        poseLabels: { low: string; mid: string; high: string };
        cueLabels: { low: string; mid: string; high: string };
        holdCue: string;
        unexpectedLabel: string;
        holdFeedback: string;
        progressLabel: string;
        malfunctionLabel: string;
        boom: string;
        stop: string;
        boomLines: readonly [string, string, string];
        boomWaveLabel: string;
        boomAudioLabel: string;
        boomNextAction: string;
        recordingAction: string;
        clueTitle: string;
        clueStatement: string;
        clueExplanation: string;
        parrotClueLines: readonly string[];
        replayAction: string;
        physicalTransition: string;
        nextStepTitle: string;
        phoneAway: string;
        physicalOnly: string;
        nextGameTitle: string;
        nextGameSteps: readonly string[];
        rhythmSounds: string;
        noSnapAlternative: string;
        materialsTitle: string;
        materials: readonly string[];
        envelopeWarning: string;
      };
    };
  };

  footer: {
    home: string;
    about: string;
    terms: string;
    privacy: string;
    licenses: string;
    creatorPrefix: string;
    authorLink: string;
    youtubeChannel: string;
    developmentJournalIntro: string;
    developmentJournalLink: string;
  };
};

export const ABOUT_SECTIONS = [
  "what",
  "forWho",
  "author",
  "access",
  "language",
  "collaboration",
  "editorial",
] as const;

export type AboutSectionKey = (typeof ABOUT_SECTIONS)[number];

export const dictionaries: Record<Lang, DictionaryShape> = {
  ru: ru as unknown as DictionaryShape,
  he: isolateMixedBidiTree(he, "he") as unknown as DictionaryShape,
  en: en as unknown as DictionaryShape,
};
