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
    <div id="aboutus-text">
      AttaliTech was launched in 2016 as the world's <b>first</b> Shiny consulting firm. The goal was simple: provide a one-stop shop for any and all of your Shiny needs, while adhering to the <b>highest standards</b>. Today, AttaliTech is a <b>global leader</b> in providing top quality R/Shiny services and is trusted by over 100 companies worldwide. We take pride in knowing you won't get better quality anywhere else.<br/><br/><b>We're certain of it.</b>
    </div>
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

<div id="clients-out" class="page-section cut1">
  <div id="clients">
    <div class="section-title">Clients</div>
    <div id="clients-subtitle">Clients range from startups to universities to Fortune 500 companies</div>
    <div id="client-logos">
      {% for client in site.data.clients %}
        <a class="client-img" href="{{ client.url }}" title="{{ client.name }}">
          <img alt="{{ client.name }}" src="/assets/img/logos/{{ client.img }}" />
        </a>
      {% endfor %}
    </div>
  </div>
</div>

<div class="cut-buffer"></div>

<div id="aboutme-section-out" class="page-section grey-section cut2">
  <div id="aboutme-section">
    <div class="section-title">About the CEO</div>
	<div id="aboutme-list" markdown="1">
{% for info in site.data.main_info %}
{% if info.icon %}<span class="about-icon fa-fw {{ info.icon }}" aria-hidden="true"></span>{% endif info.icon %}
<span class="about-content">{{ info.content }}</span>
{: .about-text }
{% endfor %}
</div>
  </div>
</div>

<div class="cut-buffer portfolio-buffer"></div>

<div id="portfolio-out" class="page-section grey-section">
  <div id="portfolio">
    <div class="section-title">
      Open-Sourced Shiny Apps
    </div>
    <div id="shinyapps-big">
      {% for app in site.data.portfolio %}
	    <div class="shinyapp">
          <a class="applink" href="{{ app.url }}">
            <img class="appimg" src="/assets/img/screenshots/{{ app.img }}" />
            <div class="apptitle">{{ app.title }}</div>
            <div class="appdesc">{{ app.description }}</div>
          </a>
        </div>
	  {% endfor %}
    </div>
  </div>
</div>

<div id="cta-out" class="page-section">
  <div id="cta">
    <div class="section-title">Take Your Shiny Apps to the Highest Level</div><br/>
  </div>
  <a href="/contact" class="actionbtn">
    <span class="far fa-envelope" aria-hidden="true"></span>
    Contact Us
  </a>
</div>

</div>
