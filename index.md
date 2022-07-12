---
layout: base
title: "Yeshiva College | Computer Science Department"
css:
  - /assets/css/index.css
ext-css:
  - //fonts.googleapis.com/css?family=Roboto:400,700
---

<div id="header" class="cut1" markdown="1">
  <div id="header-inner" markdown="1">
# Yeshiva College {#title}

## Computer Science Department {#subtitle}
<br/>
<br/>
  </div>
</div>

<div id="main-sections">
  <div class="cut-buffer aboutus-buffer"></div>

  <div id="aboutus-out" class="page-section cut2">
    <div id="aboutus">
      <div class="section-title">About Us</div>
      <div id="aboutus-text"><b>{{ site.data.info['about']}}</b>
      </div>
      <br />
      <div id="aboutus-text">{{ site.data.info['links-intro']}}
        <div class="list-joins">
          {% for l in site.data.info['links'] %}
            <a href="{{ l.link}}" class="actionbtn list-join-element">
            {{l.name}}
            </a>
          {% endfor %}
        </div>
      </div>
    </div>
  </div>

  <div class="cut-buffer values-buffer"></div>

  <div id="values-out" class="page-section cut2">
    <div id="values">
      <div class="section-title">Our Values</div>
      <div id="values-text">
        Insert YC CS Values here!
      </div>
      <a href="/contact" class="actionbtn">
        Work With Us
      </a>
    </div>
  </div>


  <div id="cta-out" class="page-section cut1">
    <div id="cta">
      <div class="section-title">Take Your Tech Skills to the Highest Level</div><br/>
    </div>
    <a href="{{ site.data.info['apply']}}" class="actionbtn">
      <span class="far fa-envelope" aria-hidden="true"></span>
      Apply Now!
    </a>
  </div>
</div>
