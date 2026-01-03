 

window.GameActions = {
     ...window.GameActionsCore,
      ...window.GameActionsTurn,
       ...window.GameActionsPlay,
        ...window.GameActionsCombat,
         ...window.GameLogicSynergies,
          ...window.GameLogicSupport // Nuevo módulo
           };