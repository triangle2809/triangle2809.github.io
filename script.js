//#region CONFIG
const DRAGON_VERSION = '16.10.1';
const DRAGON_BASE = `https://ddragon.leagueoflegends.com/cdn/${DRAGON_VERSION}`;
const LEAGUE_GROUPS = {
	domestic: {
		label: 'Domestic',
		leagues: [
			{name: 'LCK', include: ['OGN', 'LCK'] },
			{name: 'LPL', include: ['LPL'] },
			{name: 'LEC', include: ['EU LCS', 'LEC'] },
			{name: 'LCS', include: ['NA LCS', 'LCS','LTA', 'LTA N', 'LTA S'] },
			{name: 'LCP', include: ['LMS', 'LCP'] },
            {name: 'CBLOL', include: ['CBLOL']}
		]
	},
	international: {
		label: 'International',
		leagues: [
			{ name: 'Worlds', include: ['WLDs'] },
			{ name: 'MSI', include: ['MSI'] },
			{ name: 'FST', include: ['FST'] },
			{ name: 'EWC', include: ['EWC'] },
			{ name: 'MSC', include: ['MSC'] },
			{ name: 'IEM', include: ['IEM'] },
            { name: 'ASI', include: ['ASI'] }
		]
	}
};
const EMPTY_MOST_WIN_ITEM =
    '<div class="most-win-item">'
    + '<div class="most-win-placeholder"></div>'
    + '<div>&nbsp;</div>'
    + '<strong>&nbsp;</strong>'
    + '</div>';

const LOW_COLOR = '#bbbbbb';
const RED_HIGH = '#ff0400';
const BLUE_HIGH = '#004cff';
const CENTER_PURPLE = '#782fd8';

const FACED_SCALE = chroma.scale([LOW_COLOR,RED_HIGH]).mode('rgb').domain([0, 1]);
const PLAYED_SCALE = chroma.scale([LOW_COLOR,BLUE_HIGH]).mode('rgb').domain([0, 1]);

const FACED_COLORS = {
    elite: CENTER_PURPLE,
    high:  RED_HIGH,
    good:  FACED_SCALE(0.68).hex(),
    mid:   FACED_SCALE(0.50).hex(),
    low:   FACED_SCALE(0.25).hex(),
    bad:   LOW_COLOR
};
const PLAYED_COLORS = {
    elite: CENTER_PURPLE,
    high:  BLUE_HIGH,
    good:  PLAYED_SCALE(0.68).hex(),
    mid:   PLAYED_SCALE(0.50).hex(),
    low:   PLAYED_SCALE(0.25).hex(),
    bad:   LOW_COLOR
};
//#endregion

//#region STATE / STORE
const state = {
	cloudMode: 'played',
	openedChampion: null,
	careerSortMode: 'games',
    isOpenedMatchOverlay: false,
    isOpenedCareerOverlay: false,
    hoverWord: document.createElement('div')
};
const store = {
	allData: [],
	championMap: {},
	playerProfileMap: {},
	teamLogoMap: {},
    teamMap: {},
    teamAbbrMap: {},
	championWordWidthMap: {},
    wordLayoutMap: new Map(),
    championStats: {}

    //wordLayoutMap: new Map()
};
state.hoverWord.id = 'hoverWord';

//#endregion

//#region DOM REFS
const playerSelect = document.getElementById('playerSelect');
const gameDetail = document.getElementById('gameDetail');
const tooltip = document.getElementById('tooltip');
const wordcloudCanvas = document.getElementById('wordcloud');
const wordGlowCanvas = document.getElementById('wordGlowCanvas');
const wordGlowCtx = wordGlowCanvas.getContext('2d');

//const wordGlowCanvas = document.getElementById('wordGlowCanvas');

//const wordStaticGlowCtx = wordGlowCanvas.getContext('2d');

const rootStyle = getComputedStyle(document.documentElement);

let playerTomSelect = null;

//document.getElementById('wordHoverCanvas').appendChild(state.hoverWord);
//#endregion

//#region LOAD
// ====================
// LOAD
// ====================
const NOT_FLIPPED_CHAMPION_IDS = [103,166,12,32,34,1,22,893,268,200,201,233,51,69,31,122,131,119,36,28,81,114,105,41,86,79,104,120,74,39,40,59,126,202,222,145,429,43,30,38,96,897,7,64,89,127,117,99,54,57,11,902,21,62,82,25,950,267,75,111,518,76,895,56,20,2,61,516,555,246,133,33,421,888,58,107,92,68,235,147,875,35,98,14,15,901,37,16,50,134,223,91,17,412,18,48,4,6,67,45,161,106,19,101,157,777,83,804,350,904,154,238,115,26,143];

async function loadChampionMap() {
    const measureCanvas =  document.createElement('canvas');
    const measureCtx =  measureCanvas.getContext('2d');
    measureCtx.font =  '100px BBHTriangle';

    const response =
        await fetch( `${DRAGON_BASE}/data/en_US/champion.json` );
    const data =
        await response.json();
    store.championMap = {};

    Object.values(data.data)
        .forEach(champion => {
            const riotKey =
                Number(champion.key);
            store.championMap[riotKey] = {
                name: champion.name,
                img: champion.id,
                headerFlip: !NOT_FLIPPED_CHAMPION_IDS.includes(riotKey),
                wordlength: measureCtx.measureText(champion.name).width
            };
        });
}

async function loadCSV() {

    console.time('CSV TOTAL');

    console.time('fetch');

    const response1 =
        await fetch('./archive_player.csv');

    const response2 =
        await fetch('./archive_player25.csv');

    const response3 =
        await fetch('./current_player26.csv');

    console.timeEnd('fetch');

    console.time('response.text');

    const text1 =
        await response1.text();

    const text2 =
        await response2.text();

    const text3 =
        await response3.text();

    console.timeEnd('response.text');

    console.time('split');

    const lines1 =
        text1.trim().split('\n');

    const lines2 =
        text2.trim().split('\n');

    const lines3 =
        text3.trim().split('\n');

    const rows =
        lines1.slice(1)
        .concat(
            lines2.slice(1),
            lines3.slice(1)
        );

    console.timeEnd('split');

    console.time('parse rows');

    store.allData = [];

    rows.forEach((line, index) => {
        const cols = line.split(',');

        const patch = cols[2];
        const season = getSeason(patch);

        const participantid = Number(cols[3]);
        const teamId = cols[5];

        store.allData.push({
            dataIndex: index,
            league: cols[0],
            date: cols[1],
            patch: patch,
            season: season,
            participantid: participantid,
            //side: getSide(participantid),
            position: getPosition(participantid),
            playername: cols[4],
            teamId: teamId,
            teamname: getTeamName(teamId),
            teamShort: getTeamAbbr(teamId, season),
            championid: Number(cols[6]),
            result: Number(cols[7]),
            kills: Number(cols[8]),
            deaths: Number(cols[9]),
            assists: Number(cols[10]),
            dpm: Number(cols[11])
        });
    });

    console.timeEnd('parse rows');

    console.time('opponent link');

    store.allData.forEach(item => {
        const opponentIndex =
            item.participantid <= 5
                ? item.dataIndex + 5
                : item.dataIndex - 5;

        const opponent =
            store.allData[opponentIndex];

        item.opponentIndex = opponentIndex;
        item.opponentPlayer = opponent?.playername || '';

        item.opponentTeamId = opponent?.teamId || '';
        item.opponentTeam = opponent?.teamname || '';
        item.opponentTeamShort = opponent?.teamShort || '';

        item.opponentChampionId = opponent?.championid || null;
    });

    console.timeEnd('opponent link');

    console.time('renderPlayerOptions');
    renderPlayerOptions();
    console.timeEnd('renderPlayerOptions');

    console.time('initializeTomSelect');
    initializeTomSelect();
    console.timeEnd('initializeTomSelect');

    console.time('clearCanvas');
    clearCanvas();
    console.timeEnd('clearCanvas');
    renderLastUpdated();
    console.timeEnd('CSV TOTAL');
}
async function loadSimpleCSV(path) {
    const response = await fetch(path);
    const text = await response.text();
    const lines = text.trim().split('\n');
    const rows = lines.slice(1);

    return rows.map(line => {
        return line.split(',').map(value =>
                value.trim().replace(/^"|"$/g, '')
            );
    });
}

async function loadPlayerProfiles() {
    const rows = await loadSimpleCSV('./playerprofile.csv');
    store.playerProfileMap = {};
    rows.forEach(cols => {
        const team = cols[0];
        const player = cols[1];
        const image = cols[2];

        if (!player) { return; }

        store.playerProfileMap[player] = {
            team: team,
            image: image
        };
    });
}

async function loadTeamLogos() {
    const rows =await loadSimpleCSV('./teamprofile.csv');
    store.teamLogoMap = {};

    rows.forEach(cols => {
        const team = cols[0];
        const logo = cols[1];

        if (!team) { return; }

        store.teamLogoMap[team] =
            logo;
    });
}

async function loadTeamAbbrMap() {
    const rows = await loadSimpleCSV('./teammap.csv');

    store.teamMap = {};
    store.teamAbbrMap = {};

    rows.forEach(cols => {
        const teamId = cols[0];
        const teamname = cols[1];

        if (!teamId) { return; }

        store.teamMap[teamId] = {
            teamId: teamId,
            teamname: teamname
        };

        for (let season = 4; season <= 16; season++) {
            const colIndex = season - 2;
            const abbr = cols[colIndex];

            if (!abbr) { continue; }

            store.teamAbbrMap[teamId + '_s' + season] = abbr;
        }
    });
}

function buildChampionWordWidthMap() {
    const measureCanvas = document.createElement('canvas');
    const measureCtx = measureCanvas.getContext('2d');
    measureCtx.font = '100px BBHTriangle';
    store.championWordWidthMap = {};

    Object.values(store.championMap)
        .forEach(champion => {
            store.championWordWidthMap[champion.name] =
                measureCtx.measureText(champion.name).width;
        });
}
//#endregion

//#region TOMSELECT
// =========================
// TOM SELECT
// =========================

function renderPlayerOptions() {
    playerSelect.innerHTML = '<option value="">Choose Player</option>';

    const players = [
        ...new Set(
            store.allData
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
        const option = document.createElement('option');
        option.value = player;
        option.textContent = player;
        playerSelect.appendChild(option);
    });
}

function initializeTomSelect() {
    if (playerTomSelect) { return; }

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
    closeMatchOverlay();
    closeCareerOverlay();
    updatePlayerVisual();
    createFilterCheckboxes();
    applyFilters();
}
//#endregion

//#region PLAYERSECTION
// =========================
// Player Section
// =========================

function updatePlayerVisual() {
    const player = playerSelect.value;
    const playerImage = document.getElementById('playerImage');
    const teamLogo = document.getElementById('teamLogoBg');
    const profile = store.playerProfileMap[player];

    if (!profile) {
        playerImage.src = './defaultplayerimg.png';
        teamLogo.removeAttribute('src');
        return;
    }
    playerImage.src = profile.image || './defaultplayerimg.png';
    const logo = store.teamLogoMap[profile.team];

    if (logo) {
        teamLogo.src = logo;
    } else {
        teamLogo.removeAttribute('src');
    }
}

function renderPlayerInfo(data) {
	if (data.length === 0) {
		document.getElementById('playerRecord').innerHTML = '&nbsp;';
		return;
	}
    const player = playerSelect.value;
    const games = data.length;
    const wins =
        data.filter(item =>
            item.result === 1
        ).length;
    const losses = games - wins;
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
//#endregion

//#region FILTER
// =========================
// Filter
// =========================

// Filter initialize

function createFilterCheckboxes() {
    const player = playerSelect.value;
    const playerData = store.allData.filter(item => item.playername === player );

    createSeasonCheckboxes(
        [...new Set( playerData.map(item => item.season) )].sort()
    );
    createLeagueCheckboxes(playerData);
    updateFilterHandleHeight();
}

function createSeasonCheckboxes(values) {
	const selectAllContainer = document.getElementById('selectall');
	const seasonContainer = document.getElementById('seasonCheckboxes');

	selectAllContainer.innerHTML = '';
	seasonContainer.innerHTML = '';

	values.sort((a, b) =>Number(a) - Number(b));
	const allLabel = document.createElement('label');
	const allCheckbox = document.createElement('input');

	allCheckbox.type ='checkbox';
	allCheckbox.checked =true;
	allCheckbox.dataset.selectAll ='true';

	allCheckbox.onchange = function() {
		const checkboxes = seasonContainer.querySelectorAll('input[type="checkbox"]');
		checkboxes.forEach(checkbox => { checkbox.checked =allCheckbox.checked; });
		applyFilters();
	};

	allLabel.appendChild(allCheckbox);
	const allText = document.createElement('span');
	allText.className = 'filter-pill';
	allText.textContent = 'Select All';
	allLabel.appendChild(allText);
	selectAllContainer.appendChild(allLabel);

	values.forEach(value => {
		const label = document.createElement('label');
		const checkbox = document.createElement('input');
		checkbox.type = 'checkbox';
		checkbox.value = value;
		checkbox.checked = true;
		checkbox.onchange = applyFilters;
		label.appendChild(checkbox);
		const text = document.createElement('span');
		text.className = 'filter-pill';
		text.textContent = 'S' + value;
		label.appendChild(text);
		seasonContainer.appendChild(label);
	});
}

function createLeagueCheckboxes(playerData) {
	const container = document.getElementById('leagueCheckboxes');
	container.innerHTML = '';
	const availableLeagues = new Set( playerData.map(item => item.league) );

	Object.values(LEAGUE_GROUPS)
		.forEach(group => {
		const column = document.createElement('div');
			column.className = 'league-column';
			const title = document.createElement('button');
			title.type = 'button';
			title.className = 'league-group-title';
			title.textContent = group.label;
			title.addEventListener('click', function() { toggleLeagueGroup(column); });
			column.appendChild(title);

			group.leagues.forEach(league => {
				const hasData =
					league.include.some(value =>
						availableLeagues.has(value)
					);
				if (!hasData) {
					return;
				}
				const label = document.createElement('label');
				const checkbox = document.createElement('input');
				checkbox.type = 'checkbox';
				checkbox.value = league.name;
				checkbox.dataset.include = league.include.join('|');
				checkbox.checked = true;
				checkbox.onchange = applyFilters;
				label.appendChild(checkbox);
				const text = document.createElement('span');
				text.className = 'filter-pill';
				text.textContent = league.name;
				label.appendChild(text);
				column.appendChild(label);
			});

            const hasLeague = column.querySelector( 'label' );

            if (hasLeague) {
                container.appendChild( column );
            }
		});
}

function toggleLeagueGroup(column) {
	const checkboxes = column.querySelectorAll( 'input[type="checkbox"]' );
	const hasUnchecked = [...checkboxes].some(checkbox => !checkbox.checked );
	checkboxes.forEach(checkbox => {
		checkbox.checked = hasUnchecked;
	});

	applyFilters();
}

// get filter value

function getSelectedLeagueValues() {
	const checkedLeagueInputs = document.querySelectorAll( '#leagueCheckboxes input:checked');

	return [
		...new Set(
			[...checkedLeagueInputs]
				.flatMap(input => input.dataset.include.split('|') )
		)
	];
}

function getCheckedValues(containerId) {
    return [
        ...document.querySelectorAll( `#${containerId} input:checked` )
    ].map(input => input.value);
}

// filter apply

function applyFilters() {

    hideTooltip();
    const wasMatchOpen = state.isOpenedMatchOverlay;
    const openedChampion = state.openedChampion;
    const openedMatchMode = state.openedMatchMode;
    const openedHighlightDate = state.openedHighlightDate;

    const player = playerSelect.value;

    if (!player) {
        clearCanvas();
        closeMatchOverlay(true);
        return;
    }

    const selectedSeasons = getCheckedValues('seasonCheckboxes');
    const selectedLeagues = getSelectedLeagueValues();

    const filtered =
        store.allData.filter(item =>
            item.playername === player
            && selectedSeasons.includes(item.season)
            && selectedLeagues.includes(item.league)
        );

    renderDashboard(filtered);

    if (wasMatchOpen && openedChampion) {
        showChampionGames(
            openedChampion,
            openedMatchMode,
            openedHighlightDate
        );
    }
}

// filter ui

function updateFilterHandleHeight() {
	const filterArea = document.getElementById('filterArea');
	const handle = document.getElementById('filterHandle');

	requestAnimationFrame(() => {
		const height = filterArea.scrollHeight;
		handle.style.setProperty(
			'--filter-open-height',
			height + 'px'
		);
	});
}

function toggleFilterPinned(event) {
	const filterHandle = document.getElementById('filterHandle');
	filterHandle.classList.toggle('pinned'); 
	if (event) { event.stopPropagation(); }
}

function closeFilterPinned() {
	const filterHandle = document.getElementById('filterHandle');
	if (!filterHandle) { return; }
	filterHandle.classList.remove('pinned');
}

// filter event

const filterHandle = document.getElementById('filterHandle');

filterHandle.onclick = function(event){
	event.stopPropagation();
	this.classList.toggle( 'pinned' );
}; 
document.onclick = function(){
	filterHandle.classList.remove( 'pinned' );
};
//#endregion

//#region WORD CLOUD
// =========================
// WORD CLOUD
// =========================

function renderDashboard(data) {
    // Main Visual
    renderChampionWordCloud(data);
    // Side Info
    renderMostWins(data);
    renderCareerOverlay(data);
    renderPlayerInfo(data);
    renderWinrateLegend();
}

function setCloudMode(mode) {
	state.cloudMode = mode;
	document.getElementById('playedModeButton').classList.toggle('active', mode === 'played');
	document.getElementById('facedModeButton').classList.toggle('active', mode === 'faced');
	document.getElementById('mostWinsTitle').textContent =
        mode === 'faced'
		    ? 'Strong Against'
		    : 'Most Wins';
	applyFilters();
}

function renderChampionWordCloud(data) {
    clearCanvas();
    const championStats = {};

    data.forEach(item => {
        let targetChampionId = item.championid;

        if (state.cloudMode === 'faced') {
            if (item.opponentChampionId) {
                targetChampionId = item.opponentChampionId;
            }
        }

        const championInfo = store.championMap[targetChampionId];

        if (!championInfo) { return; }

        const champion = championInfo.name;

        if (!championStats[champion]) { 
            championStats[champion] = { 
                championId: targetChampionId,
                picks: 0, 
                wins: 0, 
                wordlength: championInfo.wordlength
            };
        }

        championStats[champion].picks++;
        if (item.result === 1) { championStats[champion].wins++; }
    });

    const stats = Object.values(championStats);
    store.championStats = championStats;

    if (stats.length === 0) { return; }

    const PICK_SCALE_POWER = 0.55;
    const LENGTH_SCALE_POWER = 0.25;
    const TARGET_MAX_AREA = 2.5;
    let TOTAL_TARGET_AREA = 0;

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
                TOTAL_TARGET_AREA += pickScore;
                return {
                    champion: champion,
                    pickScore: pickScore,
                    lengthScore: lengthScore
                };
            });
    //console.log(TOTAL_TARGET_AREA)
    const maxPickScore =
        Math.max(
            ...measuredWords.map(item =>
                item.pickScore
            )
        );

    const TOTAL_AREA_POWER = 0.64;
    const NORMED_TOTAL_AREA = Math.pow(TOTAL_TARGET_AREA, TOTAL_AREA_POWER);
    
    const words =
        measuredWords
            .map(item => {
                const targetArea =
                    (
                        item.pickScore
                        / NORMED_TOTAL_AREA
                    );
                    //* TARGET_MAX_AREA;
                const rawSize =
                    (
                        targetArea
                        / item.lengthScore
                    )
                    * 1200;
                return [
                    item.champion,
                    rawSize,
                    item.pickScore,
                    item.lengthScore
                ];
            });
        
    const colors = {};
    const glowLevels = {};
    
    //console.log(words);
    Object.entries(championStats)
        .forEach(([champion, stat]) => {
            const winRate =
                stat.wins / stat.picks;
            const palette =
                state.cloudMode === 'played'
                    ? PLAYED_COLORS
                    : FACED_COLORS;
            if (winRate >= 0.75) {
                colors[champion] = palette.elite;
                glowLevels[champion] = 'elite';
            } else if (winRate >= 0.70) {
                colors[champion] = palette.high;
                glowLevels[champion] = 'high';
            } else if (winRate >= 0.60) {
                colors[champion] = palette.good;
            } else if (winRate >= 0.50) {
                colors[champion] = palette.mid;
            } else if (winRate >= 0.40) {
                colors[champion] = palette.low;
            } else {
                colors[champion] = palette.bad;
            }
        });
    //console.log(championStats);
    words.sort((a, b) =>
		b[2] - a[2] || b[1] - a[1]
	);
    // console.table(
    //     words.slice(0,5).map((words) => ({
    //         champion: words[0],
    //         area: words[1]*words[3]
    //     }))
    // );
    // console.log(words.slice(0,3));

    const TOP_AREA_LIMIT = 1350;

    const topCount = Math.min(3, words.length);

    const topAreaSum =
        words
            .slice(0, topCount)
            .reduce((sum, words) => {
                const champion = words[0];
                const fontSize = words[1];
                const wordLength = words[3];

                return sum + wordLength * fontSize;
            }, 0);

    
    console.log(topAreaSum);
    const scale =
        TOP_AREA_LIMIT / topAreaSum;

    for (let i = 0; i < words.length; i++) {
        words[i][1] *= scale;
    }
    


    store.wordLayoutMap.clear();

    const ctx = wordcloudCanvas.getContext('2d');
    const wordBoxMap = new Map();

    

	WordCloud(
		wordcloudCanvas,
		{   list: words,
			shuffle: false,
			gridSize: 10,
			weightFactor: 1,
			rotateRatio: 0,
			shrinkToFit: true,
			backgroundColor: 'rgba(0, 0, 0, 0)',
			fontFamily: 'BBHTriangle',
			color: function(word) { return colors[word] || '#000000'; },

            // drawText: function(...args){ console.log(args); },

            // draw: function(item, dimension) {
            //     console.log('DRAW CHECK', item, dimension);
            // },
            drawWordBox: function(word, box) {
                store.wordLayoutMap.set(word, {
                    x: box.x,
                    y: box.y,
                    width: box.width,
                    height: box.height,
                    fontSize: box.fontSize,
                    color: box.color,

                    textX: box.x + box.width * 0.5,
                    textY: box.y + box.fontSize * 0.5
                });
                
            },
            
            hover: function(item, dimension, event) {
                clearWordGlow();
                if (!item) {
                    clearWordGlow();
                    hideTooltip();
                    return
                };
                clearWordGlow();
                wordcloudCanvas.style.cursor = 'pointer';
                const word = item[0];
                const stat = championStats[word];

                const layout = store.wordLayoutMap.get(word);
                if (!layout) return;
                
                wordcloudCanvas.onmousemove = function(event) {
                    const rect = wordcloudCanvas.getBoundingClientRect();

                    const x =
                        (event.clientX - rect.left)
                        * (wordcloudCanvas.width / rect.width);

                    const y =
                        (event.clientY - rect.top)
                        * (wordcloudCanvas.height / rect.height);

                    let isOnWord = false;

                    store.wordLayoutMap.forEach(layout => {
                        if (
                            x >= layout.x &&
                            x <= layout.x + layout.width &&
                            y >= layout.y &&
                            y <= layout.y + layout.height
                        ) {
                            isOnWord = true;
                        }
                    });

                    wordcloudCanvas.style.cursor =
                        isOnWord ? 'pointer' : 'default';
                };

                //console.log(layout);
                drawHoverGlow(word, layout);
                showTooltip(event, word, stat);

                // if (!item) {
                //     return;
                // }

                // const champion =
                //     item[0];

                // const layout =
                //     wordLayoutMap.get(
                //         champion
                //     );

                // if (!layout) {
                //     return;
                // }

                // drawWordGlow(
                //     champion,
                //     layout
                // );
            },

			click: function(item) { 
                if (!item) { return; }
				const champion = item[0];
                const stat = championStats[champion];
                //console.log('WORD CLICK', champion, stat);
				showChampionGames(stat.championId, null, null);;
			}
            
		}
	);
    // wordcloudCanvas.addEventListener(
    //     'wordcloudstop',
    //     function checkWordBoxMapOnce() {
    //         wordcloudCanvas.removeEventListener(
    //             'wordcloudstop',
    //             checkWordBoxMapOnce
    //         );

    //         //console.log('WORD BOX MAP SIZE', wordBoxMap.size);
    //         //console.log('GLOW LEVELS', glowLevels);

    //         // wordStaticGlowCtx.clearRect(
    //         //     0,
    //         //     0,
    //         //     wordStaticGlowCanvas.width,
    //         //     wordStaticGlowCanvas.height
    //         // );

    //         // Object.entries(glowLevels)
    //         //     .forEach(([champion, level]) => {
    //         //         const layout =
    //         //             wordLayoutMap.get(champion);

    //         //         if (!layout) { return; }

    //         //         drawStaticWordGlow(
    //         //             champion,
    //         //             layout,
    //         //             level
    //         //         );
    //         //     });
    //     }
    // );
}

function clearCanvas() {
    WordCloud.stop();
    wordcloudCanvas.dispatchEvent(
        new CustomEvent('wordcloudstart', {
            cancelable: true
        })
    );

    wordcloudCanvas.style.cursor = 'default';
    wordcloudCanvas.onmousemove = null;

    const canvas = wordcloudCanvas;
    const ctx = canvas.getContext('2d');

    ctx.clearRect( 0, 0, canvas.width, canvas.height );

    clearWordGlow();

    state.hoverWord.style.opacity = 0;
    state.hoverWord.style.display = 'none';
    state.hoverWord.textContent = '';

    hideTooltip();
}

function clearWordGlow() {
    wordGlowCtx.clearRect( 0, 0, wordGlowCanvas.width, wordGlowCanvas.height );
}

function drawHoverGlow(champion, layout) {
    //console.log(layout);
    wordGlowCtx.save();

    wordGlowCtx.font = layout.fontSize + 'px BBHTriangle';

    wordGlowCtx.textAlign = 'center';
    wordGlowCtx.textBaseline = 'middle';
    wordGlowCtx.lineJoin = 'round';
    wordGlowCtx.lineCap = 'round';

    wordGlowCtx.shadowColor = '#f0f1f866';
    //wordGlowCtx.shadowBlur = layout.fontSize * 0.15;
    wordGlowCtx.fillStyle = layout.color;


    const layer = [
        { blur: 0.08, alpha: 0.42 },
        { blur: 0.16, alpha: 0.27 },
        { blur: 0.24, alpha: 0.15 }
        ];
    layer.forEach(item => {
        wordGlowCtx.shadowBlur = layout.fontSize * item.blur;
        wordGlowCtx.shadowColor = `rgba(240,241,248,${item.alpha})`;

        wordGlowCtx.fillText(
            champion,
            layout.textX,
            layout.textY
        );
    });
    
    // wordGlowCtx.fillText(
    //         champion,
    //         layout.textX,
    //         layout.textY
    //     );

    wordGlowCtx.restore();
}

function drawWordGlow(champion, layout, level) {

    wordStaticGlowCtx.save();

    wordStaticGlowCtx.font =
        layout.fontSize + 'px BBHTriangle';

    wordStaticGlowCtx.textAlign =
        'center';

    wordStaticGlowCtx.textBaseline =
        'middle';

    wordStaticGlowCtx.fillStyle =
        level === 'elite'
            ? 'rgba(240,241,248,.055)'
            : 'rgba(240,241,248,.035)';

    const radius =
        level === 'elite'
            ? layout.fontSize * 0.06
            : layout.fontSize * 0.03;

    const samples =
        level === 'elite'
            ? 36
            : 18;

    for (let i = 0; i < samples; i++) {
        const angle =
            Math.PI * 2 * i / samples;

        wordStaticGlowCtx.fillText(
            champion,
            layout.centerX + Math.cos(angle) * radius,
            layout.centerY + Math.sin(angle) * radius
        );
    }

    wordStaticGlowCtx.restore();
}
//#endregion

//#region MOST WINS
// =========================
// MOST WINS
// =========================

function renderMostWins(data) {
    if (data.length === 0) {
        renderEmptyMostWins();
        return;
    }

    const championStats = {};

    data.forEach(item => {
        let targetChampionId = item.championid;
        if (state.cloudMode === 'faced') {
            if (item.opponentChampionId) {
                targetChampionId = item.opponentChampionId;
            }
        }
        const championInfo = store.championMap[targetChampionId];
        if (!championInfo) {
            return;
        }
        const champion = championInfo.name;
        if (!championStats[champion]) {
            championStats[champion] = {
                championId: targetChampionId,
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
                const winDiff = b.wins - a.wins;
                if (winDiff !== 0) {
                    return winDiff;
                }
                const winRateA = a.wins / a.picks;

                const winRateB = b.wins / b.picks;

                const winRateDiff = winRateB - winRateA;

                if (winRateDiff !== 0) {
                    return winRateDiff;
                }
                return b.latestWinDate - a.latestWinDate;
            })
            .slice(0, 5);

    while (mostWins.length < 5) {
        mostWins.push(null);
    }

    const container = document.getElementById('mostWinsList');
    container.innerHTML = '';

    mostWins.forEach(stat => {
        const item = document.createElement('div');
        item.className = 'most-win-item';

        if (!stat) {
            item.innerHTML =
                '<div class="most-win-placeholder"></div>'
                + '<div>&nbsp;</div>'
                + '<strong>&nbsp;</strong>';
            container.appendChild(item);
            return;
        }
        const img = document.createElement('img');
        img.src = getChampionImageUrl(stat.img);
        img.alt = stat.champion;
        img.style.cursor = 'pointer';
        img.onclick = function() {
            //console.log('clicked');
            showChampionGames(stat.championId, null, null);
        };
        const name = document.createElement('div');
        name.textContent = stat.champion;
        const score = document.createElement('strong');
        score.textContent = stat.wins + 'W';
        item.appendChild(img);
        item.appendChild(score);
        container.appendChild(item);
    });
}

function renderEmptyMostWins() {
	document.getElementById('mostWinsList').innerHTML =
		EMPTY_MOST_WIN_ITEM
        + EMPTY_MOST_WIN_ITEM
        + EMPTY_MOST_WIN_ITEM
        + EMPTY_MOST_WIN_ITEM
        + EMPTY_MOST_WIN_ITEM;
}
//#endregion

//#region TOOLTIP
// =========================
// Tooltip
// =========================

function showTooltip(event, champion, stat) {
    const losses = stat.picks - stat.wins;

    const winRate =
        (
            stat.wins
            / stat.picks
            * 100
        ).toFixed(1);

    tooltip.innerHTML =
        '<strong>' + champion + '</strong><br>'
        + '<WR>'+ winRate + '%</WR><br>'
        + stat.picks + 'G '
        + stat.wins + 'W '
        + losses + 'L' ;

    tooltip.style.left = event.pageX + 15 + 'px';
    tooltip.style.top = event.pageY + 15 + 'px';
    tooltip.style.display = 'block';
}

function hideTooltip() {
    tooltip.style.display ='none';
}
//#endregion

//#region MATCH OVERLAY
// =========================
// MATCH OVERLAY
// =========================

function showChampionGames(targetChampionId, nextMode = null, highlightDate = false) {
    // console.log(
    //     'SCG START', 
    //     store.championMap[targetChampionId].name,
    //     state.cloudMode,
    //     nextMode,
    //     highlightDate
    // );

    state.isOpenedMatchOverlay = true;
    state.openedChampion = Number(targetChampionId);
    const currentMode = state.cloudMode;
    const displayMode = nextMode || currentMode;

    //console.log(currentMode, displayMode);

    if (nextMode && currentMode !== displayMode) {
        setCloudMode(displayMode);
    }

	const player = playerSelect.value;
	const championInfo = store.championMap[Number(targetChampionId)];
    //console.log('player/championInfo', player, championInfo);
	if (!player || !championInfo) return;

	closeFilterPinned();

	const selectedSeasons = getCheckedValues('seasonCheckboxes');
	const selectedLeagues = getSelectedLeagueValues();
    
	const games = store.allData
		.filter(game => {
			const currentChampionId =
				displayMode === 'faced'
					? game.opponentChampionId
					: game.championid;

			return (
				game.playername === player
				&& currentChampionId === Number(targetChampionId)
				&& selectedSeasons.includes(game.season)
				&& selectedLeagues.includes(game.league)
			);
		})
		.sort((a, b) => parseGameDate(b.date) - parseGameDate(a.date));
    

	const champion = championInfo.name;
    const championCenteredImg = getChampionCenteredImageUrl(championInfo.img);
	const wins = games.filter(game => game.result === 1).length;
	const losses = games.length - wins;
	const winRate = games.length ? (wins / games.length * 100).toFixed(1) : '0.0';
    const winRateNumber = games.length ? wins / games.length : 0;
    const avgKills = games.length
        ? (games.reduce((sum, game) => sum + game.kills, 0) / games.length).toFixed(1)
        : '0.0';

    const avgDeaths = games.length
        ? (games.reduce((sum, game) => sum + game.deaths, 0) / games.length).toFixed(1)
        : '0.0';

    const avgAssists = games.length
        ? (games.reduce((sum, game) => sum + game.assists, 0) / games.length).toFixed(1)
        : '0.0';

    const avgDpm = games.length
        ? Math.round(games.reduce((sum, game) => sum + game.dpm, 0) / games.length)
        : 0;
    
    const palette = displayMode === 'played' ? PLAYED_COLORS : FACED_COLORS;
    const gaugeFillLength = Number(winRate);
    const gaugeEmptyLength = 100 - gaugeFillLength;
    const showGauge = gaugeFillLength > 1;

    //const gaugeEmptyLength = gaugeLength - gaugeFillLength;
    const gaugeStartColor = chroma.mix(palette.bad, palette.elite, 0.60).hex();
    
    const gaugeColor =
        displayMode === 'played'
            ? PLAYED_COLORS.high
            : FACED_COLORS.high;

	let html =
		'<div class="match-history-header">'
            
			+ '<div class="match-history-title">'
                + '<img class="match-history-bg-img'
                + (championInfo.headerFlip ? ' flipped' : '')
                + '" src="' + championCenteredImg + '" alt="">'

                + '<div class="match-history-gauge"'
                    + ' style="--gauge-color:' + gaugeColor + ';">'

                    + '<svg viewBox="0 0 100 100" class="match-gauge-svg">'
                        + '<defs>'
                            + '<linearGradient id="matchGaugeGradient" x1="0%" y1="100%" x2="100%" y2="100%">'
                                + '<stop offset="0%" stop-color="' + gaugeStartColor + '"/>'
                                + '<stop offset="100%" stop-color="' + palette.elite + '"/>'
                            + '</linearGradient>'
                        + '</defs>'

                        + '<path class="match-gauge-track"'
                        + ' pathLength="100"'
                        + ' d="M 18 72 A 38 38 0 1 1 82 72" />'

                        + '<path class="match-gauge-fill"'

                        + ' pathLength="100"'

                        + (
                            gaugeFillLength < 0.01
                                ? ' style="display:none;"'
                                : ' style="stroke-dasharray:'
                                    + gaugeFillLength
                                    + ' 100;"'
                        )

                        + ' stroke="url(#matchGaugeGradient)"'

                        + ' d="M 18 72 A 38 38 0 1 1 82 72" />'
                    + '</svg>'

                    + '<div class="match-history-gauge-value">'
                        + winRate + '%'
                    + '</div>'
                    + '<div class="match-history-gauge-label">WIN RATE</div>'
                    // + '<div class="match-history-gauge-summary">'
                    //     + games.length + 'G '
                    //     + wins + 'W '
                    //     + losses + 'L'
                    // + '</div>'
                + '</div>'

				+ '<div class="match-history-text">'
                    +'<div class="match-history-titleinner">MATCH HISTORY</div>'
					+ '<div class="match-history-name">'
                        + (
                            displayMode === 'faced'
                                ? player + ' VS ' + champion
                                : player + ' ' + champion
                        )
                    + '</div>'
				+ '</div>'
                + '<div class="match-history-stats">'
                    + '<div class="match-stat-block">'
                        + '<div class="match-stat-value">'
                            + games.length
                        + '</div>'
                        + '<div class="match-stat-label">'
                            + 'GP'
                        + '</div>'   
                    + '</div>'
                    + '<div class="match-stat-block">'
                        + '<div class="match-stat-value">'
                            + '&nbsp;'
                        + '</div>'
                    + '</div>'
                    + '<div class="match-stat-block">'
                        + '<div class="match-stat-value">'
                            + wins
                        + '</div>'
                        + '<div class="match-stat-label">'
                            + 'W'
                        + '</div>'   
                    + '</div>'
                    + '<div class="match-stat-block">'
                        + '<div class="match-stat-value">'
                            + '&nbsp;'
                        + '</div>'
                    + '</div>'
                    + '<div class="match-stat-block">'
                        + '<div class="match-stat-value">'
                            + losses
                        + '</div>'
                        + '<div class="match-stat-label">'
                            + 'L'
                        + '</div>'   
                    + '</div>'

                    + '<div class="match-stat-block">'
                        + '<div class="match-stat-value">'
                            + '&nbsp;&nbsp;'
                        + '</div>'
                    + '</div>'
                    + '<div class="match-stat-block">'
                        + '<div class="match-stat-value">'
                            + avgKills
                        + '</div>'
                        + '<div class="match-stat-label">'
                            + 'avg.K'
                        + '</div>'                        
                    + '</div>'
                    + '<div class="match-stat-block">'
                        + '<div class="match-stat-value">'
                            + '/'
                        + '</div>'
                    + '</div>'
                    + '<div class="match-stat-block">'
                        + '<div class="match-stat-value">'
                            + avgDeaths
                        + '</div>'
                        + '<div class="match-stat-label">'
                            + 'avg.D'
                        + '</div>'                        
                    + '</div>'
                    + '<div class="match-stat-block">'
                        + '<div class="match-stat-value">'
                            + '/'
                        + '</div>'
                    + '</div>'
                    + '<div class="match-stat-block">'
                        + '<div class="match-stat-value">'
                            + avgAssists
                        + '</div>'
                        + '<div class="match-stat-label">'
                            + 'avg.A'
                        + '</div>'                        
                    + '</div>'
                    + '<div class="match-stat-block">'
                        + '<div class="match-stat-value">'
                            + '&nbsp;&nbsp;'
                        + '</div>'
                    + '</div>'
                    + '<div class="match-stat-block">'
                        + '<div class="match-stat-value">'
                            + avgDpm
                        + '</div>'
                        + '<div class="match-stat-label">'
                            + 'avg.DPM'
                        + '</div>'
                    + '</div>' 

                + '</div>'
			+ '</div>'
		+ '</div>';

    html += '<div class="match-list">';

        games.forEach(game => {
            const ownChampionInfo = store.championMap[game.championid];
            const opponentChampionInfo = store.championMap[game.opponentChampionId];

            if (!ownChampionInfo || !opponentChampionInfo) return;

            const ownChampionImg = getChampionImageUrl(ownChampionInfo.img);
            const opponentChampionImg = getChampionImageUrl(opponentChampionInfo.img);

            const isHighlighted =
                highlightDate
                && highlightDate === game.date;

            html +=
                '<div class="match-row '
                    + (game.result === 1 ? 'match-row-win' : 'match-row-loss')
                    + (isHighlighted ? ' match-row-highlight' : '')
                + '">'

                    + '<div class="match-result">'
                        + '<div class="match-result-badge">'
                            + (game.result === 1 ? 'W' : 'L')
                        + '</div>'
                    + '</div>'

                    + '<div class="match-champions">'
                        + '<div class="match-champion">'
                            + '<img class="small-champ-img matchup-champ-img'
                                + (displayMode === 'faced' ? ' matchup-jump-img' : '')
                                + '" src="' + ownChampionImg + '"'
                                + ' data-champion-id="' + game.championid + '"'
                                + ' data-next-mode="played"'
                                + ' data-date="' + game.date + '">'
                        + '</div>'

                        + '<div class="matchup-vs">vs</div>'

                        + '<div class="match-champion">'
                            + '<img class="small-champ-img matchup-champ-img'
                                + (displayMode === 'played' ? ' matchup-jump-img' : '')
                                + '" src="' + opponentChampionImg + '"'
                                + ' data-champion-id="' + game.opponentChampionId + '"'
                                + ' data-next-mode="faced"'
                                + ' data-date="' + game.date + '">'
                        + '</div>'
                    + '</div>'

                    + '<button class="match-opponent-player"'
                        + ' data-player="' + game.opponentPlayer + '">'
                        + (game.opponentPlayer || '-')
                    + '</button>'

                    + '<div class="match-date">'
                        + '<div>' + formatShortDate(game.date) + '</div>'
                        + '<div class="match-league">' + game.league + '</div>'
                    + '</div>'

                    + '<div class="match-teams">'
                        + '<span>' + (game.teamShort || game.teamname) + '</span>'
                        + '<strong>vs</strong>'
                        + '<span>' + (game.opponentTeamShort || game.opponentTeam || '') + '</span>'
                    + '</div>'

                    + '<div class="match-kda">'
                        + '<div>'
                            + game.kills + ' / '
                            + game.deaths + ' / '
                            + game.assists
                        + '</div>'
                        + '<span>KDA</span>'
                    + '</div>'

                    + '<div class="match-dpm">'
                        + '<div>' + Math.round(game.dpm) + '</div>'
                        + '<span>DPM</span>'
                    + '</div>'

                + '</div>';
        });

        html += '</div>';

	// html += '<table><tbody>';
    // //console.log('games count', games.length);
	// games.forEach(game => {
	// 	const ownChampionInfo = store.championMap[game.championid];
	// 	const opponentChampionInfo = store.championMap[game.opponentChampionId];

	// 	if (!ownChampionInfo || !opponentChampionInfo) return;

	// 	const ownChampionImg = getChampionImageUrl(ownChampionInfo.img);
	// 	const opponentChampionImg = getChampionImageUrl(opponentChampionInfo.img);

	// 	const isHighlighted =
	// 		highlightDate
	// 		&& highlightDate === game.date;

	// 	const nextModeForOpponent =
	// 		currentMode === 'played'
	// 			? 'faced'
	// 			: 'played';

	// 	const nextChampionId =
	// 		currentMode === 'played'
	// 			? game.opponentChampionId
	// 			: game.championid;

	// 	html +=
	// 		'<tr class="'
	// 			+ (game.result === 1 ? 'match-row-win' : 'match-row-loss')
	// 			+ (isHighlighted ? ' match-row-highlight' : '')
	// 		+ '">'

	// 		+ '<td><span class="cell-content">'
	// 			+ game.date.slice(0, 8)
	// 		+ '</span></td>'

	// 		+ '<td class="matchup-cell">'

    //             + '<img class="small-champ-img matchup-champ-img'
    //                 + (displayMode === 'faced' ? ' matchup-jump-img' : '')
    //                 + '" src="' + ownChampionImg + '"'
    //                 + ' data-champion-id="' + game.championid + '"'
    //                 + ' data-next-mode="played"'
    //                 + ' data-date="' + game.date + '">'

    //             + '<span class="matchup-vs">vs</span>'

    //             + '<img class="small-champ-img matchup-champ-img'
    //                 + (displayMode === 'played' ? ' matchup-jump-img' : '')
    //                 + '" src="' + opponentChampionImg + '"'
    //                 + ' data-champion-id="' + game.opponentChampionId + '"'
    //                 + ' data-next-mode="faced"'
    //                 + ' data-date="' + game.date + '">'

    //         + '</td>'

	// 		+ '<td><span class="cell-content">'
	// 			+ game.teamname
	// 			+ ' vs '
	// 			+ (game.opponentTeam || '')
	// 		+ '</span></td>'

	// 		+ '<td><span class="cell-content">'
	// 			+ game.kills + '/'
	// 			+ game.deaths + '/'
	// 			+ game.assists
	// 		+ '</span></td>'

	// 		+ '<td>' + Math.round(game.dpm) + '</td>'

	// 		+ '</tr>';
	// });

	// html += '</tbody></table>';

	const overlay = document.getElementById('matchOverlay');
	const container = document.getElementById('matchOverlayContent');

	container.innerHTML = html;
	overlay.classList.add('open');

    //bindScrollFade(container);
    // console.log('modechange before');
    // if(currentMode == displayMode){ setCloudMode(displayMode);}
    // console.log('modechange after');

	container.querySelectorAll('.matchup-jump-img').forEach(img => {
        img.addEventListener('click', function() {
            //console.log(this.dataset);
            showChampionGames(
                this.dataset.championId,
                this.dataset.nextMode,
                this.dataset.date
            );
        });
    });
    container.querySelectorAll('.match-opponent-player').forEach(button => {
        button.addEventListener('click', function() {
            const opponentPlayer = this.dataset.player;

            if (!opponentPlayer) { return; }

            if (playerTomSelect) {
                playerTomSelect.setValue(opponentPlayer);
            } else {
                playerSelect.value = opponentPlayer;
                changePlayer();
            }

            closeMatchOverlay();
        });
    });
	const highlightedRow = container.querySelector('.match-row-highlight');
    refreshScrollFade('.match-list');
}

function closeMatchOverlay(clearContent = false) {
	state.openedChampion = null;
    state.openedMatchMode = null;
    state.openedHighlightDate = false;
	document
		.getElementById('matchOverlay')
		.classList.remove('open');
	if (clearContent) {
		document
            .getElementById('matchOverlayContent')
            .innerHTML = '';
	}
}

//#endregion

//#region CAREER OVERLAY
// =========================
// CAREER OVERLAY
// =========================
// CAREER OVERLAY CONTROL
function openCareerOverlay() {
	const overlay = document.getElementById('careerOverlay');

	if (!overlay) return;

	renderCareerOverlay();
	overlay.classList.add('open');
}

function closeCareerOverlay() {
	const overlay = document.getElementById('careerOverlay');

	if (!overlay) return;

	overlay.classList.remove('open');
}

function setCareerSort(mode) {
	state.careerSortMode = mode;
	document
		.querySelectorAll('.career-sort')
		.forEach(button => {
			button.classList.toggle(
				'active',
				button.dataset.sort === mode
			);
		});
	renderCareerOverlay();
}

// CAREER OVERLAY RENDER MAIN
function renderCareerOverlay() {
	const player = playerSelect.value;
	if (!player) { return; }
	const selectedSeasons = getCheckedValues('seasonCheckboxes');
	const selectedLeagues = getSelectedLeagueValues();

    const data =
		store.allData.filter(item =>
			item.playername === player
			&& selectedSeasons.includes(item.season)
			&& selectedLeagues.includes(item.league)
		);
	const games = data.length;
	const wins =
		data.filter(item =>
			item.result === 1
		).length;
	const losses = games - wins;
	// document.getElementById('careerSummary').textContent =
	// 	games + 'G '
	// 	+ wins + 'W '
	// 	+ losses + 'L';
    //document.getElementById('careerSummary').textContent = '';
	const championStats = {};

    data.forEach(item => {
		const targetChampionId =
            state.cloudMode === 'faced'
                ? item.opponentChampionId
                : item.championid;

        const championInfo = store.championMap[targetChampionId];
        if (!championInfo) return;

        const champion = championInfo.name;

		if (!championStats[champion]) {
			championStats[champion] = {
                championId: targetChampionId,
                champion: champion,
                img: championInfo.img,
                games: 0,
                wins: 0,
                losses: 0,
                kills: 0,
                deaths: 0,
                assists: 0,
                dpm: 0,
                recentGames: []
            };
		}

		championStats[champion].games++;
        championStats[champion].kills += item.kills;
        championStats[champion].deaths += item.deaths;
        championStats[champion].assists += item.assists;
        championStats[champion].dpm += item.dpm;

        if (item.result === 1) { championStats[champion].wins++;
        } else { championStats[champion].losses++; }
	});

	const stats =
        Object.values(championStats)
            .map(stat => {
                stat.winRate =
                    stat.games > 0
                        ? stat.wins / stat.games
                        : 0;
                stat.avgKDA =
                    stat.deaths > 0
                        ? ((stat.kills + stat.assists) / stat.deaths)
                        : (stat.kills + stat.assists);
                stat.avgDpm =
                    stat.games > 0
                        ? stat.dpm / stat.games
                        : 0;
                stat.recentGames = data
                    .filter(item => {
                        const targetChampionId =
                            state.cloudMode === 'faced'
                                ? item.opponentChampionId
                                : item.championid;

                        return targetChampionId === stat.championId;
                    })
                    .sort((a, b) =>
                        parseGameDate(b.date) - parseGameDate(a.date)
                    )
                    .slice(0, 5)
                    .map(item => {
                        const ownInfo = store.championMap[item.championid];
                        const opponentInfo =store.championMap[item.opponentChampionId]
                        const target = {
                            date: item.date,
                            clickedChampion: ownInfo.name,
                            otherChampion: opponentInfo?.name || '',
                            opponentTeam: item.opponentTeam || '',
                            dpm: Math.round(item.dpm)
                        };

                        return {
                            result: item.result,
                            date: item.date,
                            mode: 'played',
                            championId: item.championid
                        };
                    });
                //console.log(stat.recentGames[0]);
                return stat;
            })
            .sort((a, b) => {
                if (state.careerSortMode === 'wins') {
                    return b.wins - a.wins
                        || b.winRate - a.winRate
                        || parseGameDate(b.recentGames[0]?.date) - parseGameDate(a.recentGames[0]?.date)
                }
                if (state.careerSortMode === 'losses') {
                    return b.losses - a.losses
                        || a.winRate - b.winRate
                        || parseGameDate(b.recentGames[0]?.date) - parseGameDate(a.recentGames[0]?.date)
                }
                if (state.careerSortMode === 'winrate') {
                    return b.winRate - a.winRate
                        || b.games - a.games
                        || parseGameDate(b.recentGames[0]?.date) - parseGameDate(a.recentGames[0]?.date)
                }
                return b.games - a.games
                    || b.wins - a.wins
                    || parseGameDate(b.recentGames[0]?.date) - parseGameDate(a.recentGames[0]?.date)
    		});
	renderCareerTopCards(stats.slice(0, 5));
	renderCareerChampionList(stats.slice(5));
}

// CAREER OVERLAY RENDER SUB
function renderCareerTopCards(stats) {
	const container = document.getElementById('careerTopCards');
	container.innerHTML = '';

	stats.forEach((stat, index) => {
		const card = document.createElement('div');
		card.className = 'career-card';
		card.onclick = function() {
            // console.log(
            //     'CARD CLICK →',
            //     stat.champion
            // );
			showChampionGames(stat.championId,null,null);
		};
		card.innerHTML =
            '<div class="career-card-rank">'
                + (index + 1)
            + '</div>'
            + '<img src="' + getChampionImageUrl(stat.img) + '">'
            + '<div class="career-card-name">'
                + (
                    state.cloudMode === 'faced'
                        ? 'vs ' + stat.champion
                        : stat.champion
                )
            + '</div>'
            + '<div class="career-card-main">'
                + stat.games + 'G '
                + stat.wins + 'W '
                + stat.losses + 'L'
            + '</div>'
            + '<div class="career-card-winrate-wrap">'
                + '<div class="career-card-winrate-label">WR</div>'

                + '<div class="career-card-winrate-bar">'
                    + '<div class="career-card-winrate-fill"'
                    + ' style="width:' + (stat.winRate * 100).toFixed(1) + '%"'
                    + '></div>'
                + '</div>'

                + '<div class="career-card-winrate-percent">'
                + '&nbsp;'
                + (stat.winRate * 100).toFixed(1)
                + '%'
                + '</div>'
            + '</div>'
            + '<div class="career-card-sub">'
                + stat.avgKDA.toFixed(2) + ' KDA'
            + '</div>'
            + '<div class="career-card-sub">'
                + Math.round(stat.avgDpm) + ' DPM'
            + '</div>'
            + '<div class="career-recent">'
            + [  ...stat.recentGames.map((game, gameIndex) => (
                    '<span class="career-recent-'
                    + (game.result === 1 ? 'w' : 'l')
                    + '" data-recent-index="'
                    + gameIndex
                    + '">'
                    + (game.result === 1 ? 'W' : 'L')
                    + '</span>'
                )),
                ...Array( Math.max( 0, 5 - stat.recentGames.length )
                )
                .fill( '<span class="career-recent-empty"></span>' )
            ].join('')
            + '</div>'
        card
            .querySelectorAll('.career-recent span')
            .forEach(span => {
                span.addEventListener('click', function(event) {
                    event.stopPropagation();
                    const index = Number(this.dataset.recentIndex);
                    const game = stat.recentGames[index];

                    if (!game) { return; }

                    // console.log(
                    //     'RECENT CLICK →',
                    //     stat.champion,
                    //     game.result === 1
                    //         ? 'W'
                    //         : 'L',
                    //     game.date
                    // );
                    showChampionGames(stat.championId,null,game.date);
                });
            });
		container.appendChild(card);
	});
}

function renderCareerChampionList(stats) {
	const container = document.getElementById('careerChampionList');
	container.innerHTML = '';
	stats.forEach((stat, index) => {
		const row = document.createElement('div');

		row.className = 'career-row';

		row.onclick = function() { showChampionGames(stat.championId,null,null); };

		const rank = String(index + 6);

		const winRate = (stat.winRate * 100).toFixed(1);
        const avgKDA = stat.avgKDA.toFixed(2);
        const avgDpm = Math.round(stat.avgDpm)

		row.innerHTML =
			'<div>' + rank + '</div>'
			+ '<img class="career-row-img" src="'
            + getChampionImageUrl(stat.img)
            + '">'
            + makeCareerStat(
                stat.champion,
                state.cloudMode === 'faced'
                    ? 'Opponent'
                    : 'Champion'
            )
			+ makeCareerStat(stat.games, 'GP')
			+ makeCareerStat(stat.wins, 'W')
			+ makeCareerStat(stat.losses, 'L')
			+ makeCareerStat(winRate + '%', 'WR')
            + makeCareerStat(avgKDA, 'avg KDA')
            + makeCareerStat(avgDpm, 'avg DPM')
            + '<div class="career-recent-list">'
                + makeCareerStat(
                    [...stat.recentGames.map((game, index) =>
                            '<span class="career-recent-list-'
                            + (game.result === 1 ? 'w' : 'l')
                            + '" data-recent-index="'
                            + index
                            + '">'
                            + (game.result === 1 ? 'W' : 'L')
                            + '</span>'
                        ),
                        ...Array(
                            Math.max(
                                0,
                                5 - stat.recentGames.length
                            )
                        ).fill('<span class="career-recent-list-empty"></span>')
                    ].join(''),'Last 5')
            + '</div>';
        row.querySelectorAll('.career-recent-list span').forEach(span => {
            span.addEventListener('click', function(event) {
                event.stopPropagation();

                const index = Number(this.dataset.recentIndex);
                const game = stat.recentGames[index];

                if (!game) return;

                //console.log('LIST RECENT CLICK', stat.champion, game);

                showChampionGames(stat.championId, null, game.date);
            });
        });
		container.appendChild(row);
	});
    refreshScrollFade('#careerChampionList');
}

// CAREER OVERLAY DISPLAY UTILITY
function makeCareerStat(value, label) {
	return `
		<div class="career-stat">
			<div class="career-stat-value">${value}</div>
			<div class="career-stat-label">${label}</div>
		</div>
	`;
}

// CAREER OVERLAY OPEN / CLOSE
function openCareerOverlay() {

	const overlay =
		document.getElementById('careerOverlay');

	const button =
		document.getElementById('detailButton');

	if (!overlay) return;

	renderCareerOverlay();

	overlay.classList.add('open');

	button?.classList.add('active');
}

function closeCareerOverlay() {

	const overlay =
		document.getElementById('careerOverlay');

	const button =
		document.getElementById('detailButton');

	if (!overlay) return;

	overlay.classList.remove('open');

	button?.classList.remove('active');
}

//#endregion



//#region UTILITY
// =========================
// Utility
// =========================

function getSeason(patch) {
    const [major, minor] =
        String(patch)
            .split('.')
            .map(Number);

    if (major <= 3) {
        return '4';
    }

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
        14: 18,
        15: 20
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
    const id = Number(participantid);
    if (id >= 1 && id <= 5) {  return 'blue'; } 
    if (id >= 6 && id <= 10) { return 'red'; }
    return '';
}

function getPosition(participantid) {
    const id = Number(participantid);
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
    return positions[id] || '';
}

function parseGameDate(dateText) {
    const parts = String(dateText).trim().split(' ');
    const dateParts = parts[0].split('-');
    const timeParts = (parts[1] || '00:00').split(':');
    const year = 2000 + Number(dateParts[0]);
    const month = Number(dateParts[1]) - 1;
    const day = Number(dateParts[2]);
    const hour = Number(timeParts[0]);
    const minute = Number(timeParts[1]);

    return new Date(
        year,
        month,
        day,
        hour,
        minute
    ).getTime();
}

function formatShortDate(dateText) {
    const date = String(dateText).trim().split(' ')[0];

    if (date.length === 10) {
        return date.slice(2);
    }

    return date;
}

function getChampionImageUrl(championImg) {
    return `${DRAGON_BASE}/img/champion/${championImg}.png`;
}

function getChampionCenteredImageUrl(championImg) {
	return `https://ddragon.leagueoflegends.com/cdn/img/champion/centered/${championImg}_0.jpg`;
}
function getTeamAbbr(teamId, season) {
    return (
        store.teamAbbrMap[teamId + '_s' + season]
        || store.teamMap[teamId]?.teamname
        || teamId
    );
}
function getTeamName(teamId) {
    return (
        store.teamMap[teamId]?.teamname
        || teamId
    );
}
function updateCloudModeOnly(mode) {
	state.cloudMode = mode;

	document.getElementById('playedModeButton')
		.classList.toggle('active', mode === 'played');

	document.getElementById('facedModeButton')
		.classList.toggle('active', mode === 'faced');

	document.getElementById('mostWinsTitle').textContent =
		mode === 'faced' ? 'Strong Against' : 'Most Wins';
}

function updateScrollFade(element) {
	if (!element) { return; }

	const maxScroll =
		element.scrollHeight - element.clientHeight;

	if (maxScroll <= 2) {
		element.style.setProperty('--fade-top', '1');
		element.style.setProperty('--fade-bottom', '1');
		return;
	}

	const atTop =
		element.scrollTop <= 2;

	const atBottom =
		element.scrollTop >= maxScroll - 2;

	element.style.setProperty(
		'--fade-top',
		atTop ? '1' : '0'
	);

	element.style.setProperty(
		'--fade-bottom',
		atBottom ? '1' : '0'
	);
}

function bindScrollFade(element) {
	if (!element) { return; }

	element.classList.add('scroll-fade');

	element.removeEventListener(
		'scroll',
		element._scrollFadeHandler
	);

	element._scrollFadeHandler = function() {
		updateScrollFade(element);
	};

	element.addEventListener(
		'scroll',
		element._scrollFadeHandler
	);

	requestAnimationFrame(() => {
		updateScrollFade(element);
	});
}

function refreshScrollFade(selector) {
	const element =
		document.querySelector(selector);

	bindScrollFade(element);
}

function renderLastUpdated() {

    const latestRow =
        store.allData.at(-1);

    const latestDate =
        latestRow
            ? latestRow.date
                .slice(2, 16)
                .replaceAll('-', '.')
            : '';

    document.querySelector('#lastUpdated .updated-date').textContent =
        latestDate + ' UTC';
}

function renderWinrateLegend() {
    const container = document.getElementById('winrateLegend');

    const palette =
        state.cloudMode === 'played'
            ? PLAYED_COLORS
            : FACED_COLORS;

    const gradientId = 'winrateLegendGradient';

    const shadeTop = color => chroma(color).brighten(0.45).hex();
    const shadeMid = color => color;
    const shadeBot = color => chroma(color).darken(0.35).hex();

container.innerHTML = `
<div class="wr-text" style="left:200px;">WIN %</div>
<svg class="winrate-legend-svg" width="324" height="24" viewBox="0 0 324 24" preserveAspectRatio="none">

    <defs>
        <linearGradient id="wrBad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="${shadeTop(palette.bad)}"/>
            <stop offset="55%" stop-color="${shadeMid(palette.bad)}"/>
            <stop offset="100%" stop-color="${shadeBot(palette.bad)}"/>
        </linearGradient>

        <linearGradient id="wrLow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="${shadeTop(palette.low)}"/>
            <stop offset="55%" stop-color="${shadeMid(palette.low)}"/>
            <stop offset="100%" stop-color="${shadeBot(palette.low)}"/>
        </linearGradient>

        <linearGradient id="wrMid" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="${shadeTop(palette.mid)}"/>
            <stop offset="55%" stop-color="${shadeMid(palette.mid)}"/>
            <stop offset="100%" stop-color="${shadeBot(palette.mid)}"/>
        </linearGradient>

        <linearGradient id="wrGood" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="${shadeTop(palette.good)}"/>
            <stop offset="55%" stop-color="${shadeMid(palette.good)}"/>
            <stop offset="100%" stop-color="${shadeBot(palette.good)}"/>
        </linearGradient>

        <linearGradient id="wrHigh" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="${shadeTop(palette.high)}"/>
            <stop offset="55%" stop-color="${shadeMid(palette.high)}"/>
            <stop offset="100%" stop-color="${shadeBot(palette.high)}"/>
        </linearGradient>

        <linearGradient id="wrElite" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="${shadeTop(palette.elite)}"/>
            <stop offset="55%" stop-color="${shadeMid(palette.elite)}"/>
            <stop offset="100%" stop-color="${shadeBot(palette.elite)}"/>
        </linearGradient>

        <linearGradient id="wrOuterGlowBase" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="${palette.bad}"/>
            <stop offset="100%" stop-color="${palette.elite}"/>
        </linearGradient>

        

        <clipPath id="wrLegendClip">
            <rect x="0" y="0" width="324" height="12" rx="6" ry="6"/>
        </clipPath>
        
    </defs>

    <rect class="wr-segment" x="0" y="0" width="324" height="12" rx="6" ry="6" fill="url(#wrOuterGlowBase)" filter="url(#wrOuterGlowOnly)"/>

    <g clip-path="url(#wrLegendClip)">
        <rect class="wr-segment wr-cut-shadow" data-min="0" data-max="40" x="0" y="0" width="144" height="12" rx="6" ry="6" fill="url(#wrBad)"/>
        <rect class="wr-segment wr-cut-shadow" data-min="40" data-max="50" x="120" y="0" width="54" height="12" rx="6" ry="6" fill="url(#wrLow)"/>
        <rect class="wr-segment wr-cut-shadow" data-min="50" data-max="60" x="150" y="0" width="54" height="12" rx="6" ry="6" fill="url(#wrMid)"/>
        <rect class="wr-segment wr-cut-shadow" data-min="60" data-max="70" x="180" y="0" width="54" height="12" rx="6" ry="6" fill="url(#wrGood)"/>
        <rect class="wr-segment wr-cut-shadow" data-min="70" data-max="75" x="210" y="0" width="39" height="12" rx="6" ry="6" fill="url(#wrHigh)"/>
        <rect class="wr-segment wr-cut-shadow" data-min="75" data-max="100" x="225" y="0" width="99" height="12" rx="6" ry="6" fill="url(#wrElite)"/>
    </g>
</svg>
<div class="wr-label" style="left:44px;">0</div>
<div class="wr-label" style="left:164px;">40</div>
<div class="wr-label" style="left:194px;">50</div>
<div class="wr-label" style="left:224px;">60</div>
<div class="wr-label" style="left:254px;">70</div>
<div class="wr-label" style="left:269px;">75</div>
<div class="wr-label" style="left:356px;">100</div>
`;
    document.getElementById('winrateLegend').style.opacity = '1';
    bindWinrateLegendHover();
}

function getChampionsByWinrateRange(min, max) {
    return Object.entries(store.championStats)
        .filter(([champion, stat]) => {
            const winRate =
                stat.wins / stat.picks * 100;

            return max >= 100
                ? winRate >= min
                : winRate >= min && winRate < max;
        })
        .map(([champion]) => champion);
}

function drawLegendOutline(champions) {
    clearWordGlow();

    champions.forEach(champion => {
        const layout =
            store.wordLayoutMap.get(champion);

        if (!layout) { return; }

        wordGlowCtx.save();

        wordGlowCtx.font =
            layout.fontSize + 'px BBHTriangle';

        wordGlowCtx.textAlign = 'center';
        wordGlowCtx.textBaseline = 'middle';
        wordGlowCtx.lineJoin = 'round';
        wordGlowCtx.lineCap = 'round';

        wordGlowCtx.strokeStyle =
            '#f0f1f8';

        wordGlowCtx.lineWidth =
            Math.max(1.1, layout.fontSize * 0.03);

        wordGlowCtx.strokeText(
            champion,
            layout.textX,
            layout.textY
        );

        wordGlowCtx.restore();
    });
}

function bindWinrateLegendHover() {
    document
        .querySelectorAll('#winrateLegend .wr-segment[data-min]')
        .forEach(segment => {
            segment.onmouseenter = function() {
                drawLegendOutline(
                    getChampionsByWinrateRange(
                        Number(this.dataset.min),
                        Number(this.dataset.max)
                    )
                );
            };

            segment.onmouseleave = function() {
                clearWordGlow();
            };
        });
}
//#endregion

//#region MAIN
(async function init() {
    console.time('INIT TOTAL');

    console.time('loadChampionMap');
	await loadChampionMap();
    console.timeEnd('loadChampionMap');

    console.time('buildChampionWordWidthMap');
	buildChampionWordWidthMap();
    console.timeEnd('buildChampionWordWidthMap');

    console.time('loadPlayerProfiles');
	await loadPlayerProfiles();
    console.timeEnd('loadPlayerProfiles');

    console.time('loadTeamLogos');
	await loadTeamLogos();
    console.timeEnd('loadTeamLogos');

    console.time('loadTeamAbbrMap');
	await loadTeamAbbrMap();
    console.timeEnd('loadTeamAbbrMap');

    console.time('loadCSV');
	await loadCSV();
    console.timeEnd('loadCSV');
    
    console.timeEnd('INIT TOTAL');
})();
//#endregion