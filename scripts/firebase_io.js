
var current_candidate = -1;
var candidates = [];
var current_vote_value = -1;
var votes = [];
var vote_values = [];
var is_vote_form_open = false;
var client_ip = "";
var is_submitting_vote = false;
function init()
{
    // Your web app's Firebase configuration
    var firebaseConfig = {
        apiKey: "AIzaSyBNYoc7NE-2JVer-YcxjxoYGjb4HUParX8",
        authDomain: "beauti-o-meter.firebaseapp.com",
        projectId: "beauti-o-meter",
        storageBucket: "beauti-o-meter.appspot.com",
        messagingSenderId: "449281746767",
        appId: "1:449281746767:web:d12cc57e6f510288f3c73a"
    };
    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
}

function fetchCandidates()
{
    var db = firebase.firestore();
    var query = db.collection("candidates").orderBy("started_date", "asc").limit(3);
    query.get().then((snapshot) => {
        var i = 0;
        var avatars = document.getElementById("avatar").getElementsByTagName("img");
        console.log(`avatars length = ${avatars.length}`);
        snapshot.forEach((doc) => {
            candidates.push(doc.id);
            votes.push("");
            vote_values.push(-1);
            console.log("candidates.length "+candidates.length);
            var data = doc.data();
            console.log(`${doc.id} => ${data.avatar}, ${data.started_date}, ${data.rejected_date}`);
            
            var avatar = avatars[i];
            avatar.src = data.avatar;
            if(data.rejected_date < Date.now())
            {
                avatar.style = "filter: grayscale(80%);";
            }
            i++;
        });
        console.log("candidates.length check "+candidates.length);
        current_candidate = candidates.length - 1;
    });
}

function fetchVotes()
{
    if(current_candidate == -1 || client_ip == "")
    {
        setTimeout(fetchVotes, 50);
        return;
    }
    console.log(`fetch vote for /candidates/${candidates[current_candidate]}`);
    var db = firebase.firestore();
    const candidate = db.collection('candidates').doc(candidates[current_candidate]);
    var query = db.collection("votes").where("vote_for", "==", candidate);
    var needle = document.getElementById('needle-img');
    needle.style.animationName = 'needle-animation';
    query.get().then((snapshot) => {
        var normal_avg = 0;
        var normal_count = 0;
        var power_avg = 0;
        var power_count = 0;
        snapshot.forEach((doc) => {
            var data = doc.data();
            if(data.ip == client_ip)
            {
                rememberCastedVote(doc.id, data.vote_for.id, data.rating);
            }
            if(data.power_vote)
            {
                power_avg += data.rating;
                power_count += 1;
            }
            else
            {
                normal_avg += data.rating;
                normal_count += 1;
            }
        });
        const POWER_FACTOR = 7;
        const NORMAL_FACTOR = 3;
        const MAX_SCORE = 4;
        var power = power_count>0?power_avg/power_count:0;
        var normal = normal_count>0?normal_avg/normal_count:0;
        var count = power_count>0?POWER_FACTOR:0 + normal_count>0?NORMAL_FACTOR:0;
        var score = count>0?(power*POWER_FACTOR + normal*NORMAL_FACTOR)/count:0;
        score /= MAX_SCORE;
        console.log("score "+score);
        
        var status = document.getElementById("status-text")
        status.classList = [];
        status.classList.add("level-"+Math.max(0, Math.min(4, Math.floor(score*5))));
        
        var styles = document.styleSheets[0];
        for (var i in styles.cssRules)
        {
            if (styles.cssRules[i].name === 'needle-animation-'+current_candidate)
            {
                var toFrame = styles.cssRules[i].cssRules[1];
                var angle = Math.min(180, Math.max(0, score*180));
                toFrame.style.transform = 'rotate(' + angle + 'deg)';
                break;
            }
        }
        var needle = document.getElementById('needle-img');
        needle.style.animationName = 'needle-animation-'+current_candidate;
        var avatars = document.getElementById("avatar").getElementsByTagName("img");
        for (var i in avatars)
        {
            avatars[i].classList = i==current_candidate?["selected"]:[];
        }
        candidate.get().then((doc) => {
            var active_status = document.getElementById('active-status');
            const rejected = doc.data().rejected_date.toDate() < Date.now();
            console.log("doc.data().rejected_date "+doc.data().rejected_date);
            active_status.classList = rejected?["inactive"]:["active"];
        });
    });
}

function switchCandidate(index)
{
    if(is_submitting_vote)
    {
        return;
    }
    if(current_candidate == index)
    {
        return;
    }
    current_candidate = index;
    fetchVotes();
}

function onIPReady(json)
{
    client_ip = json.ip;
    document.getElementById('vote-form').style = "";
}

function rememberCastedVote(id, candidate_id, vote_value)
{
    console.log(`remember vote: ${id} candidate_id - ${candidate_id} vote_value - ${vote_value}`);
    for(var i in candidates)
    {
        if(candidates[i] == candidate_id)
        {
            vote_values[i] = vote_value;
            votes[i] = id;
        }
    }
}

function vote(score)
{
    if(is_submitting_vote)
    {
        return;
    }
    if(current_vote_value < 0)
    {
        return;
    }
    var stars = document.getElementById('stars').getElementsByTagName("span");
    current_vote_value = score;
    for (var i in stars)
    {
        var star = stars[i];
        star.classList = i<=current_vote_value?["checked"]:[];
    }
}

function submitVote()
{
    if(current_candidate == -1 || client_ip == "")
    {
        return;
    }
    if(is_submitting_vote)
    {
        return;
    }
    var db = firebase.firestore();
    const vote_id = votes[current_candidate];
    const candidate = db.collection('candidates').doc(candidates[current_candidate]);
    if(vote_id == "")
    {
        db.collection("votes").add({
            ip: client_ip,
            power_vote: false,
            rating: current_vote_value,
            vote_for: candidate
        }).then((doc) => {
            console.log("new vote casted with new id: ", doc.id);
            fetchVotes();
            is_submitting_vote = false;
        });
    }
    else
    {
        db.collection('votes').doc(vote_id).set({
            rating: current_vote_value
        }, {
            merge: true 
        }).then(() => {
            console.log("vote successfully updated!");
            fetchVotes();
            is_submitting_vote = false;
        });
    }
    is_submitting_vote = true;
    toggleVoteForm();
}

function toggleVoteForm()
{
    var stars = document.getElementById('stars');
    var submit_button = document.getElementById('vote-submit-btn');
    submit_button.style = stars.style = is_vote_form_open?"display: none;":"";
    is_vote_form_open = !is_vote_form_open;
}

init();
fetchCandidates();
fetchVotes();