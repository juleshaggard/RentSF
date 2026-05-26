import { describe, expect, it } from "vitest";
import { parseAmsiListings } from "../src/lib/scrapers/amsi";
import { parseBrickTimberListings } from "../src/lib/scrapers/brick-timber";
import { parseChandlerListings } from "../src/lib/scrapers/chandler";
import { parseJwavroListings } from "../src/lib/scrapers/jwavro";
import { parseSfBayListings } from "../src/lib/scrapers/sfbay";
import { parseStructureListings } from "../src/lib/scrapers/structure";
import { parseWcpmListings } from "../src/lib/scrapers/wcpm";

describe("scraper fixture parsers", () => {
  it("parses Chandler listing cards", () => {
    const listings = parseChandlerListings(`
      <div class="listing-item">
        <a href="/rental-listings/?lid=1001"><img src="https://cdn.example.com/a.jpg"></a>
        <div class="address">123 Page St</div>
        <div class="rent-price">$2,995</div>
        <div class="beds">1 Bed</div>
        <div class="baths">1 Bath</div>
        <div class="lstng-avail">Available Now</div>
        <a href="/rental_applications/1001">Apply</a>
      </div>
    `);

    expect(listings).toHaveLength(1);
    expect(listings[0]).toMatchObject({ externalId: "1001", rent: 2995, bedrooms: 1 });
  });

  it("parses Structure ShowMojo cards", () => {
    const listings = parseStructureListings(`
      <div class="js-listing" id="uid_abc123" data-lat="37.776" data-long="-122.42">
        <div class="listing-address-header">88 Dolores St</div>
        <div class="listing-city-state-zip">San Francisco, CA 94103</div>
        <div class="listing-title">Sunny Mission 1BR</div>
        <div class="price">$3,100</div>
        <div class="listing-details">Bed: 1 Bath: 1 650 sqft</div>
        <a class="js-wsi-schedule-link" href="/l/abc123">Schedule</a>
        <div class="listing-pictures"><img src="/photos/a.jpg"></div>
      </div>
    `);

    expect(listings[0]).toMatchObject({ externalId: "abc123", bedrooms: 1, bathrooms: 1, sqft: 650 });
  });

  it("parses Brick + Timber public data", () => {
    const listings = parseBrickTimberListings({
      properties: [
        {
          propertyId: "p1",
          propertyName: "The Page",
          address: "123 Page St",
          city: "San Francisco",
          state: "CA",
          zipcode: "94102",
          latitude: "37.77",
          longitude: "-122.42",
          neighborhood: "Lower Haight"
        }
      ],
      apartments: [
        {
          id: "a1",
          propertyId: "p1",
          propertyName: "The Page",
          floorplanName: "A1",
          apartmentName: "4",
          apartmentId: "apt4",
          beds: "1",
          baths: "1",
          minrent: "2995",
          maxrent: "3100",
          sqft: "700",
          apartmentImages: JSON.stringify([{ imageURL: "https://cdn.example.com/a.jpg" }])
        },
        {
          id: "a2",
          propertyId: "p1",
          propertyName: "The Page",
          floorplanName: "B2",
          apartmentName: "5",
          apartmentId: "apt5",
          beds: "2",
          baths: "1",
          minrent: "3995",
          maxrent: "4100"
        }
      ]
    });

    expect(listings).toHaveLength(1);
    expect(listings[0]).toMatchObject({ externalId: "apt4", bedrooms: 1, neighborhood: "Lower Haight" });
  });

  it("parses WCPM AppFolio cards and marker data", () => {
    const listings = parseWcpmListings(`
      <div id="listing_77" class="js-listing-item">
        <div class="js-listing-title"><a href="/listings/detail/slug-77">123 Market #5</a></div>
        <div class="js-listing-address">123 Market St, San Francisco, CA 94105</div>
        <div class="js-listing-blurb-rent">$3,250</div>
        <div class="js-listing-blurb-bed-bath">1 Bed / 1 Bath</div>
        <div class="js-listing-square-feet">710 sqft</div>
        <img class="js-listing-image" data-original="https://cdn.example.com/wcpm.jpg">
      </div>
      <script>window.mapConfig = { markers: [{"latitude":37.79,"longitude":-122.4,"address":"123 Market St","listing_id":77}] };</script>
    `);

    expect(listings[0]).toMatchObject({ externalId: "slug-77", rent: 3250, bedrooms: 1, sqft: 710 });
    expect(listings[0].lat).toBe(37.79);
  });

  it("parses AMSI, SF Bay Rental Co., and J. Wavro static cards", () => {
    const amsi = parseAmsiListings(`
      <div class="listing-item">
        <h3>One bedroom near Alamo Square</h3>
        <div class="address">555 Fulton St, San Francisco, CA</div>
        <a href="/listings/detail/amsi-1">Details</a>
        <span>$2,850 1 Bed 1 Bath 620 sqft</span>
        <img src="/a.jpg">
      </div>
    `);
    const sfBay = parseSfBayListings(`
      <div class="green-street-box">
        <a href="/property/one-bed/">Details</a>
        <div class="green-street-text"><h3>901 Bush St</h3><h2>$2,900</h2></div>
        <p>1 Bedroom 1 Bath</p>
        <img src="https://cdn.example.com/sf.jpg">
      </div>
    `);
    const jwavro = parseJwavroListings(`
      <a class="rental-card-link" href="/rental_detail.php?id=900" data-neighborhood="Nob Hill" data-price="3195" data-bedrooms="1">
        <img src="https://cdn.example.com/jw.jpg" alt="Nob Hill one bedroom">
        <div class="rental-card-description">Nob Hill one bedroom</div>
        <span>1 Bath</span>
      </a>
    `);

    expect(amsi[0]).toMatchObject({ rent: 2850, bedrooms: 1, bathrooms: 1, sqft: 620 });
    expect(sfBay[0]).toMatchObject({ rent: 2900, bedrooms: 1, bathrooms: 1 });
    expect(jwavro[0]).toMatchObject({ externalId: "900", rent: 3195, bedrooms: 1, neighborhood: "Nob Hill" });
  });
});
