import MuseScore 3.0
import QtQuick 2.2

MuseScore {
    version: "1.0"
    description: "Wysyła partyturę do StageSync"
    menuPath: "Plugins.StageSync Push"

    onRun: {
        console.log("StageSync Plugin uruchomiony!");
        if (curScore) {
            console.log("Tytuł partytury:", curScore.scoreName);
            console.log("Liczba taktów:", curScore.ntracks);
        }
        Qt.quit();
    }
}
