
var current_candidate = -1;
var candidates = [];
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
        if(candidates.length > 0)
        {
            current_candidate = 0;
            fetchVotes();
        }
    });
    
}

function fetchVotes()
{
    console.log("current_candidate "+candidates[current_candidate]);
    if(current_candidate == -1)
    {
        return;
    }
    console.log(`fetch vote for /candidates/${candidates[current_candidate]}`);
    var db = firebase.firestore();
    const candidate = db.collection('candidates').doc(candidates[current_candidate]);
    var query = db.collection("votes").where("vote_for", "==", candidate);
    
    query.get().then((snapshot) => {
        var vote_for = null;
        var normal_avg = 0;
        var normal_count = 0;
        var power_avg = 0;
        var power_count = 0;
        snapshot.forEach((doc) => {
            var data = doc.data();
            console.log(`data ${data.vote_for.id}`);
            vote_for = data.vote_for;
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
        console.log("power_avg "+power_avg);
        var power = power_count>0?power_avg/power_count:0;
        var normal = normal_count>0?normal_avg/normal_count:0;
        var count = power_count>0?1:0 + normal_count>0?1:0;
        var score = count>0?(power + normal)/count:0;

        console.log("score "+score);
        
        var status = document.getElementById("status-text")
        status.classList = [];
        status.classList.add("level-"+Math.floor(score));
        
        var styles = document.styleSheets[0];
        for (var i in styles.cssRules)
        {
            if (styles.cssRules[i].name === 'needle-animation-'+current_candidate)
            {
                console.log("found animation needle-animation-"+current_candidate);
                var toFrame = styles.cssRules[i].cssRules[1];
                var angle = score*180/5;
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
    current_candidate = index;
    fetchVotes();
}

function onIPReady(ip)
{
    // enable vote field
}

function vote(score)
{

}

init();
fetchCandidates();