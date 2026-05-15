let allData = [];

let championMap = {};

async function loadChampionMap() {

    const response =
        await fetch(
            'https://ddragon.leagueoflegends.com/cdn/16.10.1/data/en_US/champion.json'
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
                    1
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

    rows.forEach(line => {

        const cols =
            line.split(',');

        allData.push({

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

    createPlayerOptions();

    initializeTomSelect();

    clearCanvas();
}

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

function createPlayerOptions() {

    const select =
        document.getElementById('playerSelect');

    select.innerHTML =
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

        select.appendChild(option);
    });
}

function initializeTomSelect() {

    new TomSelect(
        '#playerSelect',
        {

            create: false,

            searchField: ['text'],

            sortField: {

                field: 'text',

                direction: 'asc'
            }
        }
    );
}

function changePlayer() {

    hideTooltip();

    createFilterCheckboxes();

    applyFilters();
}

function createFilterCheckboxes() {

    const player =
        document.getElementById('playerSelect').value;

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

    allLabel.appendChild(
        document.createTextNode(' Select All')
    );

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

        label.appendChild(
            document.createTextNode(' ' + value)
        );

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
        document.getElementById('playerSelect').value;

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

    renderChampionWordCloud(filtered);
    renderMostWins(filtered);
    renderPlayerInfo(filtered);
}

function clearGameDetail() {

	document.getElementById('gameDetail').innerHTML =
		'';
}

function renderChampionWordCloud(data) {

    clearCanvas();

    const championStats = {};

    data.forEach(item => {

        const championInfo =
            championMap[item.championid];

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

    const maxPicks =
        Math.max(
            ...stats.map(stat =>
                stat.picks
            )
        );

    const maxFontSize =
        99;

    const minFontSize =
        1;

    const words =

        Object.entries(championStats)
            .map(([champion, stat]) => {

                const adjustedPicks =
                    stat.picks
                    / stat.wordlength;

                const normalizedSize =
                    minFontSize
                    + (
                        adjustedPicks
                        / maxPicks
                    )
                    * (
                        maxFontSize
                        - minFontSize
                    );

                return [

                    champion,

                    normalizedSize
                ];
            });

    const colors = {};

    Object.entries(championStats)
        .forEach(([champion, stat]) => {

            const winRate =
                stat.wins / stat.picks;

            if (winRate >= 0.7) {

                colors[champion] =
                    '#FF6B6B';

            } else if (winRate >= 0.5) {

                colors[champion] =
                    '#4ECDC4';

            } else {

                colors[champion] =
                    '#999999';
            }
        });

    WordCloud(

        document.getElementById('wordcloud'),

        {

            list: words,

            gridSize: 10,

            weightFactor: 1,

            rotateRatio: 0,

            backgroundColor: '#ffffff',

            fontFamily:
                '"BBHTriangle", sans-serif',

            color: function(word) {

                return colors[word]
                    || '#000000';
            },

            hover: function(item, dimension, event) {

                if (!item) {

                    hideTooltip();

                    return;
                }

                const champion =
                    item[0];

                const stat =
                    championStats[champion];

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
function renderMostWins(data) {

    const championStats = {};

    data.forEach(item => {

        const championInfo =
            championMap[item.championid];

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

    const container =
        document.getElementById('mostWinsList');

    let html = '';

    mostWins.forEach(stat => {

        const imgUrl =
            'https://ddragon.leagueoflegends.com/cdn/16.10.1/img/champion/'
            + stat.img
            + '.png';

        html +=
            '<div class="most-win-item">'
            + '<img src="' + imgUrl + '" alt="' + stat.champion + '">'
            + '<div>' + stat.champion + '</div>'
            + '<strong>' + stat.wins + 'W</strong>'
            + '</div>';
    });

    container.innerHTML =
        html;
}

function renderPlayerInfo(data) {

    const player =
        document.getElementById('playerSelect').value;

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

    document.getElementById('playerName').textContent =
        player.toUpperCase();

    document.getElementById('playerCareer').textContent =
        getPlayerCareerText(data);
}

function getPlayerCareerText(data) {

    const leagues = [
        ...new Set(
            data.map(item => item.league)
        )
    ];

    return leagues.join(' / ');
}

function showTooltip(event, champion, stat) {

    const tooltip =
        document.getElementById('tooltip');

    const losses =
        stat.picks - stat.wins;

    const winRate =
        (
            stat.wins
            / stat.picks
            * 100
        ).toFixed(1);

    tooltip.innerHTML =

        '<strong>' + champion + '</strong><br>'
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

function hideTooltip() {

    document.getElementById('tooltip')
        .style.display =
        'none';
}

function showChampionGames(champion) {

    const player =
        document.getElementById('playerSelect').value;

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
            .filter(({ item }) => {

                const championInfo =
                    championMap[item.championid];

                return (
                    item.playername === player
                    && championInfo
                    && championInfo.name === champion
                    && selectedSeasons.includes(item.season)
                    && selectedLeagues.includes(item.league)
                );
            })
            .sort((a, b) =>
                parseGameDate(b.item.date)
                - parseGameDate(a.item.date)
            );

    const container =
        document.getElementById('gameDetail');

    let html =
        '<h2>' + champion + ' Games</h2>';

    html +=
        '<table>'
        + '<thead>'
        + '<tr>'
        + '<th>Date</th>'
        + '<th>VS Pick</th>'
        + '<th>Match</th>'
        + '<th>Result</th>'
        + '<th>KDA</th>'
        + '<th>DPM</th>'
        + '</tr>'
        + '</thead>'
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

        const opponentChampionInfo =
            opponent
                ? championMap[opponent.championid]
                : null;

        const opponentChampionImg =
            opponentChampionInfo
                ? 'https://ddragon.leagueoflegends.com/cdn/16.10.1/img/champion/'
                    + opponentChampionInfo.img
                    + '.png'
                : '';

        let opponentTeam = '';

        if (game.participantid <= 5) {

            opponentTeam =
                allData[index + 5]?.teamname || '';
        }

        else {

            opponentTeam =
                allData[index - 5]?.teamname || '';
        }

        html +=
            '<tr>'
            + '<td>' + game.date.slice(0, 8) + '</td>'
            + '<td>'
                + (
                    opponentChampionImg
                        ? '<img class="small-champ-img" src="' + opponentChampionImg + '">'
                        : ''
                )
            + '</td>'
            + '<td>'
                + game.teamname
                + ' vs '
                + opponentTeam
            + '</td>'
            + '<td>' + (game.result === 1 ? 'W' : 'L') + '</td>'
            + '<td>'
                + game.kills + '/'
                + game.deaths + '/'
                + game.assists
            + '</td>'
            + '<td>' + Math.round(game.dpm) + '</td>'
            + '</tr>';
    });

    html +=
        '</tbody>'
        + '</table>';

    container.innerHTML =
        html;
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

function excelDateToText(excelDate) {

    const value =
        Number(excelDate);

    if (!value || Number.isNaN(value)) {

        return String(excelDate || '');
    }

    const date =
        new Date(
            (value - 25569)
            * 86400
            * 1000
        );

    if (Number.isNaN(date.getTime())) {

        return String(excelDate);
    }

    return date
        .toISOString()
        .slice(0, 10);
}

function clearCanvas() {

    const canvas =
        document.getElementById('wordcloud');

    const ctx =
        canvas.getContext('2d');

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );
}

(async () => {

    await loadChampionMap();

    await loadCSV();

})();