---
layout: base
title: "Yeshiva University | Computer Science Department"
css:
  - /assets/css/index.css
ext-css:
  - //fonts.googleapis.com/css?family=Roboto:400,700
---

<div id="header" class="cut1" markdown="1">

<div id="header-inner" markdown="1">

# Yeshiva University {#title}

## Computer Science Department {#subtitle}

</div>

<div id="main-sections">
<!-- <div class="cut-buffer aboutus-buffer"></div> -->

<div id="aboutus-out" class="page-section grey-section cut2">
  <div id="aboutus">
    <div class="section-title">About Us</div>
    <div id="aboutus-text"><b>{{ site.data.info['about']}}</b>
    </div>
    <br />
    <div id="aboutus-text">{{ site.data.info['links-intro']}}
    </div>
    <br />
    {% for l in site.data.info['links'] %}
        <a href="{{ l.link}}" class="actionbtn">
        {{l.name}}
        </a>
        <br />
      {% endfor %}
  </div>
</div>

<div class="cut-buffer values-buffer"></div>

<div id="values-out" class="page-section cut2">
  <div id="values">
	  <div class="section-title">Our Values</div>
    <div id="values-text">
      At AttaliTech, we care about good code, good user experience, and doing things <b>right</b>.<br/><br/>
      We believe in developing every project as if it's your own, <b>never </b>compromising on code quality or end-user experience. We focus on more than just delivering a final product - we're always looking for ways to add more <b>value</b> to our clients. Our clients enjoy peace of mind knowing they can trust us to deliver clean, robust, maintainable code that just works.
    </div>
    <a href="/contact" class="actionbtn">
      Work With Us
    </a>
  </div>
</div>


<div id="cta-out" class="page-section">
  <div id="cta">
    <div class="section-title">Take Your Tech Skills to the Highest Level</div><br/>
  </div>
  <a href="{{ site.data.info['apply']}}" class="actionbtn">
    <span class="far fa-envelope" aria-hidden="true"></span>
    Apply Now!
  </a>
</div>

</div>
