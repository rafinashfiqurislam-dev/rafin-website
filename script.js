const SUPABASE_URL = "https://cspaxzkzbegcovnqksnt.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_KjOboVCYaDqittL5YYCDcw_eqqj6I9e";

/*
  Gemini is intentionally NOT hard-coded into this public browser file.
  Deploy the Supabase Edge Function in supabase/functions/chat-with-ai and
  store GEMINI_API_KEY as a Supabase secret. This keeps the Gemini key out
  of GitHub Pages and other public static assets.
*/

function saveRequest(data){
  sessionStorage.setItem("rafin_request", JSON.stringify(data));
  sessionStorage.setItem(
    "rafin_request_return",
    data.service === "marketing"
      ? "marketing.html"
      : "web-development.html"
  );
}

function initRequestForm(formId, service){
  const form = document.getElementById(formId);
  if(!form) return;

  form.addEventListener("submit", e => {
    e.preventDefault();

    const fd = new FormData(form);
    const data = Object.fromEntries(fd.entries());

    data.service = service;
    saveRequest(data);

    location.href = "review.html";
  });
}

function initMarketingForm(formId){
  const form = document.getElementById(formId);
  const select = document.getElementById("brandType");
  const otherWrap = document.getElementById("otherWrap");
  const otherInput = document.getElementById("otherCategory");

  if(!form) return;

  select.addEventListener("change", () => {
    const isOther = select.value === "Other";

    otherWrap.hidden = !isOther;
    otherInput.required = isOther;
  });

  form.addEventListener("submit", e => {
    e.preventDefault();

    const fd = new FormData(form);
    const data = Object.fromEntries(fd.entries());

    data.service = "marketing";

    if(data.brand_type !== "Other"){
      delete data.other_category;
    }

    saveRequest(data);
    location.href = "review.html";
  });
}

function escapeHtml(value){
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#039;"
  }[c]));
}

function initReviewPage(){
  const raw = sessionStorage.getItem("rafin_request");
  const box = document.getElementById("reviewBox");
  const back = document.getElementById("backBtn");
  const confirm = document.getElementById("confirmBtn");
  const error = document.getElementById("confirmError");

  if(!raw){
    box.innerHTML =
      "<div class='reviewRow'><div class='reviewValue'>No request data was found.</div></div>";

    confirm.disabled = true;
    back.onclick = () => location.href = "services.html";
    return;
  }

  const data = JSON.parse(raw);

  const labels = {
    service:"Service",
    name:"Name",
    phone:"Phone Number",
    email:"Email",
    about:"Website Requirement",
    brand_type:"Business / Brand Type",
    other_category:"Other Category"
  };

  box.innerHTML = Object.entries(data)
    .filter(([key]) => key !== "service" || data.service)
    .map(([key,value]) => `
      <div class="reviewRow">
        <div class="reviewLabel">${escapeHtml(labels[key] || key)}</div>
        <div class="reviewValue">
          ${escapeHtml(
            key === "service"
              ? (value === "marketing"
                  ? "Marketing"
                  : "Website Development")
              : value
          )}
        </div>
      </div>
    `)
    .join("");

  back.onclick = () => {
    location.href =
      sessionStorage.getItem("rafin_request_return") ||
      "services.html";
  };

  confirm.onclick = async () => {
    confirm.disabled = true;
    confirm.textContent = "Saving...";
    error.hidden = true;

    try{
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/service_requests`,
        {
          method:"POST",
          headers:{
            "Content-Type":"application/json",
            "apikey":SUPABASE_PUBLISHABLE_KEY,
            "Authorization":`Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
            "Prefer":"return=minimal"
          },
          body:JSON.stringify({
            service:data.service,
            name:data.name,
            phone:data.phone,
            email:data.email,
            about:data.about || null,
            brand_type:data.brand_type || null,
            other_category:data.other_category || null
          })
        }
      );

      if(!response.ok){
        const detail = await response.text();
        throw new Error(
          detail || "Unable to save request."
        );
      }

      sessionStorage.removeItem("rafin_request");
      location.href = "success.html";

    }catch(err){
      console.error(err);

      error.textContent =
        "The request could not be saved. Please check the Supabase table and Row Level Security policy.";

      error.hidden = false;
      confirm.disabled = false;
      confirm.innerHTML = "Confirm <span>→</span>";
    }
  };
}


/* =========================================================
   ALPHA AI CHAT
   ========================================================= */

function initChat(){
  const form = document.getElementById("chatForm");
  const input = document.getElementById("chatInput");
  const messages = document.getElementById("chatMessages");
  const status = document.getElementById("chatStatus");

  if(!form || !input || !messages) return;


  /* Add normal chat message */
  const addMessage = (text, type) => {
    const el = document.createElement("div");

    el.className =
      type === "user"
        ? "userMessage"
        : "assistantMessage";

    el.textContent = text;

    messages.appendChild(el);
    messages.scrollTop = messages.scrollHeight;

    return el;
  };


  /* Auto-grow message input */
  input.addEventListener("input", () => {
    input.style.height = "auto";

    input.style.height =
      Math.min(input.scrollHeight, 150) + "px";
  });


  /* Send message */
  form.addEventListener("submit", async e => {
    e.preventDefault();

    const text = input.value.trim();

    if(!text) return;


    /* User message */
    addMessage(text, "user");


    /* Clear input */
    input.value = "";
    input.style.height = "auto";


    /* Alpha animated loading mark */
    const thinking = document.createElement("div");

    thinking.className = "assistantMessage";

    thinking.setAttribute(
      "aria-label",
      "Alpha AI is responding"
    );

    thinking.innerHTML = `
      <span
        class="alphaThinking"
        aria-hidden="true"
      >
        <span class="alphaLogoCore"></span>

        <span
          class="alphaLogoArc alphaLogoArcOne"
        ></span>

        <span
          class="alphaLogoArc alphaLogoArcTwo"
        ></span>
      </span>
    `;

    messages.appendChild(thinking);

    messages.scrollTop =
      messages.scrollHeight;


    if(status){
      status.textContent =
        "Alpha AI is responding...";
    }


    try{

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/chat-with-ai`,
        {
          method:"POST",

          headers:{
            "Content-Type":"application/json",
            "apikey":SUPABASE_PUBLISHABLE_KEY,
            "Authorization":
              `Bearer ${SUPABASE_PUBLISHABLE_KEY}`
          },

          body:JSON.stringify({
            message:text
          })
        }
      );


      const result = await response.json();


      if(!response.ok){
        throw new Error(
          result.error ||
          "AI request failed."
        );
      }


      /* Replace Alpha loading mark with AI response */
      thinking.className =
        "assistantMessage";

      thinking.innerHTML = "";

      thinking.textContent =
        result.text ||
        "I could not generate a response.";


      if(status){
        status.textContent = "Ready";
      }


    }catch(err){

      console.error(
        "AI chat error:",
        err
      );


      /* Show error instead of loading animation */
      thinking.className =
        "assistantMessage";

      thinking.innerHTML = "";

      thinking.textContent =
        `AI Error: ${
          err.message ||
          "Unknown error"
        }`;


      if(status){
        status.textContent =
          "AI service error.";
      }
    }


    messages.scrollTop =
      messages.scrollHeight;
  });
      }
