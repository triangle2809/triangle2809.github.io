let allData = [];

let championMap = {};

let cloudMode = 'played';

const DRAGON_VERSION = '16.10.1';

const DRAGON_BASE =
    `https://ddragon.leagueoflegends.com/cdn/${DRAGON_VERSION}`;

const playerSelect =
    document.getElementById('playerSelect');

const gameDetail =
    document.getElementById('gameDetail');

const tooltip =
    document.getElementById('tooltip');

const wordcloudCanvas =
    document.getElementById('wordcloud');

const EMPTY_MOST_WIN_ITEM =
    '<div class="most-win-item">'
    + '<div class="most-win-placeholder"></div>'
    + '<div>&nbsp;</div>'
    + '<strong>&nbsp;</strong>'
    + '</div>';

let playerTomSelect = null;

let openedChampion = null;

let highlightTarget = null;

let championWordWidthMap = {};

let hoveredWordData = null;

const wordGlowCanvas =
    document.getElementById('wordGlowCanvas');

const wordGlowCtx =
    wordGlowCanvas.getContext('2d');


async function loadChampionMap() {

    const measureCanvas =
        document.createElement('canvas');

    const measureCtx =
        measureCanvas.getContext('2d');

    measureCtx.font =
        '100px BBHTriangle';

    const response =
        await fetch(
            `${DRAGON_BASE}/data/en_US/champion.json`
        );

    const data =
        await response.json();

    championMap = {};

    Object.values(data.data)
        .forEach(champion => {

            const riotKey =
                Number(champion.key);

            championMap[riotKey] = {

                name: champion.name,

                img:
                    champion.id,

                wordlength:
                    measureCtx
                    .measureText(champion.name)
                    .width
            };
        });
}

async function loadCSV() {

    const response =
        await fetch('./archive_player_.csv');

    const text =
        await response.text();

    const lines =
        text.trim().split('\n');

    const rows =
        lines.slice(1);

    allData = [];

    rows.forEach((line, index) => {

        const cols =
            line.split(',');

        allData.push({

            dataIndex: index,

            league: cols[0],

            date: cols[1],

            patch: cols[2],

            season: getSeason(cols[2]),

            participantid: Number(cols[3]),

            side: getSide(cols[3]),

            position: getPosition(cols[3]),

            playername: cols[4],

            teamname: cols[5],

            championid: Number(cols[6]),

            result: Number(cols[7]),

            kills: Number(cols[8]),

            deaths: Number(cols[9]),

            assists: Number(cols[10]),

            dpm: Number(cols[11])
        });
    });

    renderPlayerOptions();

    initializeTomSelect();

    clearCanvas();
}



function renderPlayerOptions() {

    playerSelect.innerHTML =
        '<option value="">Choose Player</option>';

    const players = [

        ...new Set(

            allData
                .filter(item =>
                    item.playername
                )
                .map(item =>
                    item.playername
                )
        )
    ];

    players.sort();

    players.forEach(player => {

        const option =
            document.createElement('option');

        option.value =
            player;

        option.textContent =
            player;

        playerSelect.appendChild(option);
    });
}

function initializeTomSelect() {

    if (playerTomSelect) {

        return;
    }

	playerTomSelect =
		new TomSelect(
			'#playerSelect',
			{

				create: false,

				searchField: ['text'],

				sortField: {

					field: 'text',

					direction: 'asc'
				},

                onChange: function() {

                    this.blur();
                },

                onFocus: function() {

                    this.clear();
                }
			}
		);

	playerTomSelect.wrapper.classList.add('player-name-select');
}

function changePlayer() {

    hideTooltip();

    clearGameDetail();

    createFilterCheckboxes();

    applyFilters();
}

// =========================
// Filter
// =========================

function createFilterCheckboxes() {

    const player =
        playerSelect.value;

    const playerData =
        allData.filter(item =>
            item.playername === player
        );

    createCheckboxGroup(

        'seasonCheckboxes',

        [...new Set(
            playerData.map(item => item.season)
        )].sort()
    );

    createCheckboxGroup(

        'leagueCheckboxes',

        [...new Set(
            playerData.map(item => item.league)
        )].sort()
    );
}

function createCheckboxGroup(containerId, values) {

    const container =
        document.getElementById(containerId);

    container.innerHTML = '';

    values.sort((a, b) =>
        Number(a) - Number(b)
    );

    const allLabel =
        document.createElement('label');

    const allCheckbox =
        document.createElement('input');

    allCheckbox.type =
        'checkbox';

    allCheckbox.checked =
        true;

    allCheckbox.dataset.selectAll =
        'true';

    allCheckbox.onchange = function() {

        const checkboxes =
            container.querySelectorAll(
                'input[type="checkbox"]:not([data-select-all])'
            );

        checkboxes.forEach(checkbox => {

            checkbox.checked =
                allCheckbox.checked;
        });

        applyFilters();
    };

    allLabel.appendChild(allCheckbox);

    const allText =
        document.createElement('span');

    allText.className =
        'filter-pill';

    allText.textContent =
        'Select All';

    allLabel.appendChild(allText);

    container.appendChild(allLabel);

    values.forEach(value => {

        const label =
            document.createElement('label');

        const checkbox =
            document.createElement('input');

        checkbox.type =
            'checkbox';

        checkbox.value =
            value;

        checkbox.checked =
            true;

        checkbox.onchange =
            applyFilters;

        label.appendChild(checkbox);

        const text =
            document.createElement('span');

        text.className =
            'filter-pill';

        text.textContent =
            value;

        label.appendChild(text);

        container.appendChild(label);
    });
}

function getCheckedValues(containerId) {

    return [

        ...document.querySelectorAll(
            `#${containerId} input:checked`
        )

    ].map(input => input.value);
}

function applyFilters() {

    hideTooltip();
    clearGameDetail();

    const player =
        playerSelect.value;

    if (!player) {

        clearCanvas();

        return;
    }

    const selectedSeasons =
        getCheckedValues('seasonCheckboxes');

    const selectedLeagues =
        getCheckedValues('leagueCheckboxes');

    const filtered =
        allData.filter(item =>

            item.playername === player
            && selectedSeasons.includes(item.season)
            && selectedLeagues.includes(item.league)
        );

    renderDashboard(filtered);
}



// =========================
// Render
// =========================

function renderDashboard(data) {

    // Main Visual
    renderChampionWordCloud(data);

    // Side Info
    renderMostWins(data);
    renderPlayerInfo(data);
}

// Main Visual
function renderChampionWordCloud(data) {

    clearCanvas();

    const championStats = {};

    data.forEach(item => {

        let targetChampionId =
            item.championid;

        if (cloudMode === 'faced') {

            let opponent = null;

            const originalIndex =
                item.dataIndex;

            if (item.participantid <= 5) {

                opponent =
                    allData[originalIndex + 5];

            } else {

                opponent =
                    allData[originalIndex - 5];
            }

            if (opponent) {

                targetChampionId =
                    opponent.championid;
            }
        }

        const championInfo =
            championMap[targetChampionId];

        if (!championInfo) {

            return;
        }

        const champion =
            championInfo.name;

        if (!championStats[champion]) {

            championStats[champion] = {

                picks: 0,

                wins: 0,

                wordlength:
                    championInfo.wordlength
            };
        }

        championStats[champion].picks++;

        if (item.result === 1) {

            championStats[champion].wins++;
        }
    });

    const stats =
        Object.values(championStats);

    if (stats.length === 0) {

        return;
    }
    const PICK_SCALE_POWER =
        0.65;

    const LENGTH_SCALE_POWER =
        0.2;

    const TARGET_MAX_AREA =
        3.5;

    const measuredWords =
        Object.entries(championStats)
            .map(([champion, stat]) => {

                const pickScore =
                    Math.pow(
                        stat.picks,
                        PICK_SCALE_POWER
                    );

                const lengthScore =
                    Math.pow(
                        stat.wordlength,
                        LENGTH_SCALE_POWER
                    );

                return {
                    champion: champion,
                    pickScore: pickScore,
                    lengthScore: lengthScore
                };
            });

    const maxPickScore =
        Math.max(
            ...measuredWords.map(item =>
                item.pickScore
            )
        );

    const words =
        measuredWords
            .map(item => {

                const targetArea =
                    (
                        item.pickScore
                        / maxPickScore
                    )
                    * TARGET_MAX_AREA;

                const rawSize =
                    (
                        targetArea
                        / item.lengthScore
                    )
                    * 100;

                return [
                    item.champion,
                    rawSize
                ];
            });

const LOW_COLOR = '#bbbbbb';

const RED_HIGH =
    '#ff0400';

const BLUE_HIGH =
    '#004cff';

const CENTER_PURPLE = '#631bbb';

const FACED_SCALE = chroma.scale([LOW_COLOR,RED_HIGH]).mode('rgb').domain([0, 1]);

const PLAYED_SCALE = chroma.scale([LOW_COLOR,BLUE_HIGH]).mode('rgb').domain([0, 1]);



const FACED_COLORS = {
    elite: CENTER_PURPLE,
    high:  RED_HIGH,
    good:  FACED_SCALE(0.75).hex(),
    mid:   FACED_SCALE(0.50).hex(),
    low:   FACED_SCALE(0.20).hex(),
    bad:   LOW_COLOR
};

const PLAYED_COLORS = {
    elite: CENTER_PURPLE,
    high:  BLUE_HIGH,
    good:  PLAYED_SCALE(0.75).hex(),
    mid:   PLAYED_SCALE(0.50).hex(),
    low:   PLAYED_SCALE(0.20).hex(),
    bad:   LOW_COLOR
};



// const PLAYED_COLORS = {
//     elite: '#631bbb',
//     high:  '#004cff',
//     good:  '#5484F5',
//     mid:   '#91B0F8',
//     low:   '#DAE4FC',
//     bad:   '#FFFFFF'
// };



// const FACED_COLORS = {
//     elite:'#631bbb',
//     high:'#ff0400',
//     good:'#FF5B58',
//     mid:'#FF9593',
//     low:'#FFDBDB',
//     bad:'#FFFFFF'
// }

// const WARM_BAD =
//     '#fff5f1';

// const RED_HIGH =
//     '#FF1511';

// const BLUE_HIGH =
//     '#1726ff'; // 여기만 네가 조정
// const BLUE_BAD =
//     '#f0fbff'; // 일단 임시 앵커

// const FACED_SCALE =
//     chroma
//         .scale([
//             WARM_BAD,
//             RED_HIGH,
//             CENTER_PURPLE
//         ])
//         .mode('lch')
//         .domain([0, 1, 1.3]);

// const PLAYED_SCALE =
//     chroma
//         .scale([
//             BLUE_BAD,
//             BLUE_HIGH,
//             CENTER_PURPLE
//         ])
//         .mode('lch')
//         .domain([0, 1, 1.3]);

// const FACED_COLORS = {
//     elite: CENTER_PURPLE,
//     high:  RED_HIGH,
//     good:  FACED_SCALE(0.75).hex(),
//     mid:   FACED_SCALE(0.55).hex(),
//     low:   FACED_SCALE(0.30).hex(),
//     bad:   WARM_BAD
// };

// const PLAYED_COLORS = {
//     elite: CENTER_PURPLE,
//     high:  BLUE_HIGH,
//     good:  PLAYED_SCALE(0.75).hex(),
//     mid:   PLAYED_SCALE(0.55).hex(),
//     low:   PLAYED_SCALE(0.30).hex(),
//     bad:   BLUE_BAD
// };
     const colors = {};

    Object.entries(championStats)
        .forEach(([champion, stat]) => {

            const winRate =
                stat.wins / stat.picks;

            const palette =
                cloudMode === 'played'
                    ? PLAYED_COLORS
                    : FACED_COLORS;

            if (winRate >= 0.75) {

                colors[champion] =
                    palette.elite;

            } else if (winRate >= 0.70) {

                colors[champion] =
                    palette.high;

            } else if (winRate >= 0.60) {

                colors[champion] =
                    palette.good;

            } else if (winRate >= 0.50) {

                colors[champion] =
                    palette.mid;

            } else if (winRate >= 0.40) {

                colors[champion] =
                    palette.low;

            } else {

                colors[champion] =
                    palette.bad;
            }
        });

    words.sort((a, b) =>
		b[1] - a[1]
	);

	WordCloud(

		wordcloudCanvas,

		{

			list: words,

			shuffle: false,

			gridSize: 10,

			weightFactor: 1,

			rotateRatio: 0,

			shrinkToFit: true,

			backgroundColor: 'rgba(0, 0, 0, 0)',

			fontFamily:
				'BBHTriangle',

			color: function(word) {

				return colors[word]
					|| '#000000';
			},

            hover: function(item, dimension, event) {

                clearWordGlow();

                if (!item) {

                    wordGlowCanvas.style.opacity = 0;

                    hideTooltip();

                    return;
                }

                wordGlowCanvas.style.opacity = 1;

                const champion =
                    item[0];

                const stat =
                    championStats[champion];

                drawWordGlow(
                    champion,
                    dimension,
                    colors[champion]
                );

                showTooltip(
                    event,
                    champion,
                    stat
                );
            },

			click: function(item) {

				if (!item) {

					return;
				}

				const champion =
					item[0];

				showChampionGames(champion);
			}
		}
	);
}

// Side Info
function renderMostWins(data) {

    if (data.length === 0) {

        renderEmptyMostWins();

        return;
    }

    const championStats = {};

    data.forEach(item => {

        let targetChampionId =
            item.championid;

        if (cloudMode === 'faced') {

            let opponent = null;

            if (item.participantid <= 5) {

                opponent =
                    allData[item.dataIndex + 5];

            } else {

                opponent =
                    allData[item.dataIndex - 5];
            }

            if (!opponent) {

                return;
            }

            targetChampionId =
                opponent.championid;
        }

        const championInfo =
            championMap[targetChampionId];

        if (!championInfo) {

            return;
        }

        const champion =
            championInfo.name;

        if (!championStats[champion]) {

            championStats[champion] = {

                champion: champion,

                img: championInfo.img,

                picks: 0,

                wins: 0,

                latestWinDate: 0
            };
        }

        championStats[champion].picks++;

        if (item.result === 1) {

            championStats[champion].wins++;

            championStats[champion].latestWinDate =
                Math.max(
                    championStats[champion].latestWinDate,
                    parseGameDate(item.date)
                );
        }
    });

    const mostWins =
        Object.values(championStats)
            .filter(stat =>
                stat.wins > 0
            )
            .sort((a, b) => {

                const winDiff =
                    b.wins - a.wins;

                if (winDiff !== 0) {

                    return winDiff;
                }

                const winRateA =
                    a.wins / a.picks;

                const winRateB =
                    b.wins / b.picks;

                const winRateDiff =
                    winRateB - winRateA;

                if (winRateDiff !== 0) {

                    return winRateDiff;
                }

                return b.latestWinDate - a.latestWinDate;
            })
            .slice(0, 5);

    while (mostWins.length < 5) {

        mostWins.push(null);
    }

    const container =
        document.getElementById('mostWinsList');

    container.innerHTML = '';

    mostWins.forEach(stat => {

        const item =
            document.createElement('div');

        item.className =
            'most-win-item';

        if (!stat) {

            item.innerHTML =
                '<div class="most-win-placeholder"></div>'
                + '<div>&nbsp;</div>'
                + '<strong>&nbsp;</strong>';

            container.appendChild(item);

            return;
        }

        const img =
            document.createElement('img');

        img.src =
            getChampionImageUrl(stat.img);

        img.alt =
            stat.champion;

        img.style.cursor =
            'pointer';

        img.onclick = function() {

            showChampionGames(stat.champion);
        };

        const name =
            document.createElement('div');

        name.textContent =
            stat.champion;

        const score =
            document.createElement('strong');

        score.textContent =
            stat.wins + 'W';

        item.appendChild(img);

        //item.appendChild(name);

        item.appendChild(score);

        container.appendChild(item);
    });
}

function renderPlayerInfo(data) {
	if (data.length === 0) {

		document.getElementById('playerRecord').innerHTML =
			'&nbsp;';

		return;
	}

    const player =
        playerSelect.value;

    const games =
        data.length;

    const wins =
        data.filter(item =>
            item.result === 1
        ).length;

    const losses =
        games - wins;

    const winRate =
        games > 0
            ? (wins / games * 100).toFixed(1)
            : '0.0';

    document.getElementById('playerRecord').textContent =
        games + 'G '
        + wins + 'W '
        + losses + 'L '
        + '(' + winRate + '%)';

}

function getPlayerCareerText(data) {

    const leagues = [
        ...new Set(
            data.map(item => item.league)
        )
    ];

    return leagues.join(' / ');
}

// =========================
// Tooltip
// =========================

function showTooltip(event, champion, stat) {

    const losses =
        stat.picks - stat.wins;

    const winRate =
        (
            stat.wins
            / stat.picks
            * 100
        ).toFixed(1);

    tooltip.innerHTML =

        '<strong>' 
        
        + champion + '</strong><br>'
        + stat.picks + 'G '
        + stat.wins + 'W '
        + losses + 'L<br>'
        + winRate + '%';

    tooltip.style.left =
        event.pageX + 15 + 'px';

    tooltip.style.top =
        event.pageY + 15 + 'px';

    tooltip.style.display =
        'block';
}



// =========================
// Match Table
// =========================

function showChampionGames(champion, keepHighlight = false) {

    if (!keepHighlight) {
        highlightTarget = null;
    }

    closeFilterPanel();
    const overlay =
        document.getElementById('matchOverlay');

    const overlayTitle =
        cloudMode === 'faced'
            ? 'vs ' + champion + ' Match History'
            : champion + ' Match History';

    if (
        overlay.classList.contains('open')
        && openedChampion === overlayTitle
    ) {
        closeMatchOverlay();
        return;
    }

    openedChampion =
        overlayTitle;

    const player =
        playerSelect.value;

    const selectedSeasons =
        getCheckedValues('seasonCheckboxes');

    const selectedLeagues =
        getCheckedValues('leagueCheckboxes');

    const games =
        allData
            .map((item, index) => ({
                item,
                index
            }))
            .filter(({ item, index }) => {
                const ownChampionInfo =
                    championMap[item.championid];

                let targetChampionInfo =
                    ownChampionInfo;

                if (cloudMode === 'faced') {
                    let opponent = null;

                    if (item.participantid <= 5) {
                        opponent =
                            allData[index + 5];
                    } else {
                        opponent =
                            allData[index - 5];
                    }

                    targetChampionInfo =
                        opponent
                            ? championMap[opponent.championid]
                            : null;
                }

                return (
                    item.playername === player
                    && targetChampionInfo
                    && targetChampionInfo.name === champion
                    && selectedSeasons.includes(item.season)
                    && selectedLeagues.includes(item.league)
                );
            })
            .sort((a, b) =>
                parseGameDate(b.item.date)
                - parseGameDate(a.item.date)
            );

    const container =
        document.getElementById('matchOverlayContent');

    const wins =
        games.filter(({ item }) =>
            item.result === 1
        ).length;

    const losses =
        games.length - wins;

    const winRate =
        games.length > 0
            ? (wins / games.length * 100).toFixed(1)
            : '0.0';

    let html =
        '<div class="match-history-header">'

            + '<div class="match-history-title">'

                + '<div class="match-history-text">'

                    + '<div class="match-history-name">'
                    + (
                        cloudMode === 'faced'
                            ? 'vs ' + champion + ' MATCH HISTORY'
                            : champion + ' MATCH HISTORY'
                    )
                    + '</div>'

                    + '<div class="match-history-summary">'
                        + games.length + 'G '
                        + wins + 'W '
                        + losses + 'L '
                        + '(' + winRate + '%)'
                    + '</div>'

                + '</div>'

            + '</div>'

            + '<div class="match-table-header">'

                + '<div>Date</div>'
                + '<div>Matchup</div>'
                + '<div>Match</div>'
                + '<div>KDA</div>'
                + '<div>DPM</div>'

            + '</div>'

        + '</div>';

    html +=
        '<table>'
        + '<tbody>';

    games.forEach(({ item: game, index }) => {
    let opponent = null;

    if (game.participantid <= 5) {
        opponent =
            allData[index + 5];
    } else {
        opponent =
            allData[index - 5];
    }

    const ownChampionInfo =
        championMap[game.championid];

    const opponentChampionInfo =
        opponent
            ? championMap[opponent.championid]
            : null;

    const ownChampionImg =
        ownChampionInfo
            ? getChampionImageUrl(ownChampionInfo.img)
            : '';

    const opponentChampionImg =
        opponentChampionInfo
            ? getChampionImageUrl(opponentChampionInfo.img)
            : '';

    let opponentTeam = '';

    if (game.participantid <= 5) {
        opponentTeam =
            allData[index + 5]?.teamname || '';
    } else {
        opponentTeam =
            allData[index - 5]?.teamname || '';
    }

    const ownHighlightTarget = {
        date: game.date,
        clickedChampion: ownChampionInfo.name,
        otherChampion: opponentChampionInfo.name,
        opponentTeam: opponentTeam,
        dpm: Math.round(game.dpm)
    };

    const opponentHighlightTarget = {
        date: game.date,
        clickedChampion: opponentChampionInfo.name,
        otherChampion: ownChampionInfo.name,
        opponentTeam: opponentTeam,
        dpm: Math.round(game.dpm)
    };

    const ownTargetText =
        encodeURIComponent(
            JSON.stringify(ownHighlightTarget)
        );

    const opponentTargetText =
        encodeURIComponent(
            JSON.stringify(opponentHighlightTarget)
        );

    const currentOverlayTitle =
        openedChampion;

    const ownOverlayTitle =
        ownChampionInfo.name + ' Match History';

    const opponentOverlayTitle =
        'vs ' + opponentChampionInfo.name + ' Match History';

    const isCurrentOwnChampion =
        cloudMode === 'played'
        && currentOverlayTitle === ownOverlayTitle;

    const isCurrentOpponentChampion =
        cloudMode === 'faced'
        && currentOverlayTitle === opponentOverlayTitle;

    const isHighlighted =
        highlightTarget
        && highlightTarget.date === game.date
        && highlightTarget.dpm === Math.round(game.dpm)
        && (
            ownChampionInfo.name === highlightTarget.clickedChampion
            || opponentChampionInfo.name === highlightTarget.clickedChampion
        )
        && (
            ownChampionInfo.name === highlightTarget.otherChampion
            || opponentChampionInfo.name === highlightTarget.otherChampion
        )
        && opponentTeam === highlightTarget.opponentTeam;

    html +=
        '<tr class="'
        + (
            game.result === 1
                ? 'match-row-win'
                : 'match-row-loss'
        )
        + (
            isHighlighted
                ? ' match-row-highlight'
                : ''
        )
        + '">'

        + '<td><span class="cell-content">'
        + game.date.slice(0, 8)
        + '</span></td>'

        + '<td class="matchup-cell">'

            + (
                ownChampionImg
                    ? '<img class="small-champ-img matchup-champ-img'
                        + (isCurrentOwnChampion ? ' matchup-champ-current' : '')
                        + '" src="' + ownChampionImg + '" ' 
                        + ownChampionImg + '" '
                        + 'data-mode="played" '
                        + 'data-champion-id="' + game.championid + '" '
                        + 'data-target="' + ownTargetText + '">'
                    : ''
            )

            + '<span class="matchup-vs">vs</span>'

            + (
                opponentChampionImg
                    ? '<img class="small-champ-img matchup-champ-img'
                        + (isCurrentOpponentChampion ? ' matchup-champ-current' : '')
                        + '" src="' + opponentChampionImg + '" ' + opponentChampionImg + '" '
                        + 'data-mode="faced" '
                        + 'data-champion-id="' + opponent.championid + '" '
                        + 'data-target="' + opponentTargetText + '">'
                    : ''
            )

        + '</td>'

        + '<td><span class="cell-content">'
            + game.teamname
            + ' vs '
            + opponentTeam
        + '</span></td>'

        + '<td><span class="cell-content">'
            + game.kills + '/'
            + game.deaths + '/'
            + game.assists
        + '</span></td>'

        + '<td>' + Math.round(game.dpm) + '</td>'

        + '</tr>';
});
    html +=
        '</tbody>'
        + '</table>';

    container.innerHTML =
        html;

    if (!highlightTarget) {
        container.scrollTop = 0;
    }

    container
    .querySelectorAll('.matchup-champ-img')
    .forEach(img => {

        img.addEventListener('click', function() {

            jumpChampionMode(
                this.dataset.mode,
                this.dataset.championId,
                this.dataset.target
            );
        });
    });

    document
        .getElementById('matchOverlay')
        .classList.add('open');

    const highlightedRow =
        container.querySelector('.match-row-highlight');

    if (highlightedRow) {
        highlightedRow.scrollIntoView({
            block: 'center',
            behavior: 'smooth'
        });
    }

    setTimeout(() => {

        document
            .querySelectorAll('.match-row-highlight')
            .forEach(row => {

                row.classList.remove(
                    'match-row-highlight'
                );
            });

    }, 1600);
}



function setCloudMode(mode) {

	cloudMode =
		mode;

	document
		.getElementById('playedModeButton')
		.classList.toggle('active', mode === 'played');

	document
		.getElementById('facedModeButton')
		.classList.toggle('active', mode === 'faced');

	document.getElementById('mostWinsTitle').textContent =
	mode === 'faced'
		? 'Strong Against'
		: 'Most Wins';

    //createFilterCheckboxes();
	applyFilters();
}

(async () => {

    await loadChampionMap();

    buildChampionWordWidthMap();

    await loadCSV();

})();

function layoutPlayerVisual() {

	const visual =
		document.getElementById('playerVisual');

	const logo =
		document.getElementById('teamLogoBg');

	const player =
		document.getElementById('playerImage');

	if (!visual || !logo || !player) {

		return;
	}

	const boxWidth =
		visual.clientWidth;

	const boxHeight =
		visual.clientHeight;

	if (!boxWidth || !boxHeight) {

		return;
	}

	logo.style.width =
		(boxWidth * 0.68) + 'px';

	logo.style.top =
		(boxHeight * 0.04) + 'px';

	player.style.width =
		(boxWidth * 0.95) + 'px';

	player.style.bottom =
		'0px';
}
window.addEventListener('load', layoutPlayerVisual);

window.addEventListener('resize', layoutPlayerVisual);

function renderEmptyMostWins() {

	document.getElementById('mostWinsList').innerHTML =
		EMPTY_MOST_WIN_ITEM
        + EMPTY_MOST_WIN_ITEM
        + EMPTY_MOST_WIN_ITEM
        + EMPTY_MOST_WIN_ITEM
        + EMPTY_MOST_WIN_ITEM;
}
function toggleFilterPanel() {

	const panel =
		document.getElementById('filterPanel');

	const button =
		document.getElementById('filterHandle');

	const playerSection =
		document.getElementById('playerSection');

	const isOpen =
		panel.classList.toggle('open');

	playerSection.classList.toggle(
		'filter-open',
		isOpen
	);

}
function closeFilterPanel() {

	const panel =
		document.getElementById('filterPanel');

	const handle =
		document.getElementById('filterHandle');

	const playerSection =
		document.getElementById('playerSection');

	if (panel) {
		panel.classList.remove('open');
	}

	if (playerSection) {
		playerSection.classList.remove('filter-open');
	}

	if (handle) {
		handle.classList.remove('open');
	}
}

function closeMatchOverlay() {

    openedChampion =
        null;

	document
		.getElementById('matchOverlay')
		.classList.remove('open');
}

// =========================
// Utility
// =========================

function getSeason(patch) {

    const [major, minor] =
        String(patch)
            .split('.')
            .map(Number);

    const worldLastPatch = {

        4: 14,
        5: 18,
        6: 18,
        7: 19,
        8: 19,
        9: 19,
        10: 19,
        11: 19,
        12: 18,
        13: 19,
        14: 18
    };

    if (
        worldLastPatch[major]
        && minor > worldLastPatch[major]
    ) {

        return String(major + 1);
    }

    return String(major);
}

function getSide(participantid) {

    const id =
        Number(participantid);

    if (id >= 1 && id <= 5) {

        return 'blue';
    }

    if (id >= 6 && id <= 10) {

        return 'red';
    }

    return '';
}

function getPosition(participantid) {

    const id =
        Number(participantid);

    const positions = {

        1: 'top',
        2: 'jng',
        3: 'mid',
        4: 'bot',
        5: 'sup',
        6: 'top',
        7: 'jng',
        8: 'mid',
        9: 'bot',
        10: 'sup'
    };

    return positions[id]
        || '';
}

function parseGameDate(dateText) {

    const parts =
        String(dateText).trim().split(' ');

    const dateParts =
        parts[0].split('-');

    const timeParts =
        (parts[1] || '00:00').split(':');

    const year =
        2000 + Number(dateParts[0]);

    const month =
        Number(dateParts[1]) - 1;

    const day =
        Number(dateParts[2]);

    const hour =
        Number(timeParts[0]);

    const minute =
        Number(timeParts[1]);

    return new Date(
        year,
        month,
        day,
        hour,
        minute
    ).getTime();
}

function getChampionImageUrl(championImg) {

    return `${DRAGON_BASE}/img/champion/${championImg}.png`;
}

// =========================
// Reset / Clear
// =========================

function hideTooltip() {
    tooltip.style.display ='none';
}

function clearGameDetail() {

	document
		.getElementById('matchOverlay')
		.classList.remove('open');

	document
		.getElementById('matchOverlayContent')
		.innerHTML = '';
}

function clearCanvas() {

    const canvas =
        wordcloudCanvas;

    const ctx =
        canvas.getContext('2d');

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );
}

function jumpChampionMode(mode, championId, targetText) {

    const championInfo =
        championMap[Number(championId)];

    if (!championInfo) {
        return;
    }

    const champion =
        championInfo.name;

    const overlayTitle =
        mode === 'faced'
            ? 'vs ' + champion + ' Match History'
            : champion + ' Match History';

    if (
        cloudMode === mode
        && openedChampion === overlayTitle
    ) {
        return;
    }

    highlightTarget =
        targetText
            ? JSON.parse(decodeURIComponent(targetText))
            : null;

    if (cloudMode !== mode) {
        setCloudMode(mode);
    }

    showChampionGames(champion, true);
}

function buildChampionWordWidthMap() {

    const measureCanvas =
        document.createElement('canvas');

    const measureCtx =
        measureCanvas.getContext('2d');

    measureCtx.font =
        '100px BBHTriangle';

    championWordWidthMap = {};

    Object.values(championMap)
        .forEach(champion => {

            championWordWidthMap[champion.name] =
                measureCtx
                    .measureText(champion.name)
                    .width;
        });
}

function renderGlow() {

    const canvas =
        wordcloudCanvas;

    const ctx =
        canvas.getContext('2d');

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    if (!hoveredWordData) {

        applyFilters();
        return;
    }

    applyFilters();

    requestAnimationFrame(() => {

        const glow =
            hoveredWordData;

        ctx.save();

        ctx.font =
            `${glow.h}px BBHTriangle`;

        ctx.textAlign =
            'center';

        ctx.textBaseline =
            'middle';

        ctx.shadowColor =
            glow.color;

        ctx.shadowBlur =
            34;

        ctx.fillStyle =
            glow.color;

        ctx.globalAlpha =
            0.9;

        ctx.fillText(
            glow.text,
            glow.x + glow.w / 2,
            glow.y + glow.h / 2
        );

        ctx.restore();
    });
}

function clearWordGlow() {

    wordGlowCtx.clearRect(
        0,
        0,
        wordGlowCanvas.width,
        wordGlowCanvas.height
    );
}

function drawWordGlow(champion, dimension, color) {

    const centerX =
        dimension.x + dimension.w / 2;

    const centerY =
        dimension.y + dimension.h / 2;

    const w =
        dimension.w * 1.04;

    const x =
        centerX - w / 2;

    const h =
        dimension.h * 0.46;

    const y =
        centerY - h / 2 + dimension.h * 0.06;

    wordGlowCtx.save();

    wordGlowCtx.fillStyle =
        'rgba(28,25,43,0.26)';

    wordGlowCtx.beginPath();

    wordGlowCtx.roundRect(
        x,
        y,
        w,
        h,
        Math.max(4, h * 0.12)
    );

    wordGlowCtx.fill();

    wordGlowCtx.restore();
}