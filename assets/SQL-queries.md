### Query 1: Count of Emails Sent, Delivered, and Duration Calculation

**Purpose**: This query calculates the total number of emails that were sent and delivered within a specific campaign (`run9`). It also computes the total duration (in seconds) between the first and last email event within that campaign.

- **Columns**:
  - `duration_sec`: The time duration (in seconds) between the first and last event in the `ses_events` table for the specified campaign. This is derived by calculating the difference between the Unix timestamps of the earliest and latest email events.
  - `emails_send`: The total number of emails that were sent, identified by the `Send` event type.
  - `emails_delivered`: The total number of emails that were successfully delivered, identified by the `Delivery` event type.
  - `subject`: A count of the number of email events that have a subject field, indicating how many emails had a subject associated with them.
  - `distinct_subject`: A count of the unique subjects among the emails, to understand how many distinct subjects were used in this campaign.

- **Data Source**: The table `ses_events`, filtered for email events where the campaign tag (`mail.tags.campaign[1]`) is `'run9'`.

```sql
SELECT 
    (max(date_diff('second', TIMESTAMP '1970-01-01 00:00:00', CAST(from_iso8601_timestamp(mail.timestamp) AS timestamp))) - min(date_diff('second', TIMESTAMP '1970-01-01 00:00:00', CAST(from_iso8601_timestamp(mail.timestamp) AS timestamp)))) AS duration_sec,
    SUM(CASE WHEN eventtype = 'Send' THEN 1 ELSE 0 END) AS emails_send,
    SUM(CASE WHEN eventtype = 'Delivery' THEN 1 ELSE 0 END) AS emails_delivered,
    COUNT(mail.commonHeaders.subject) AS subject,
    COUNT(distinct mail.commonHeaders.subject) AS distinct_subject
FROM
    ses_events
WHERE
    mail.tags.campaign[1] = 'run9';
```

---

### Query 2: Ensure No Duplicate Email Sends

**Purpose**: This query checks if any email has been sent more than once for the campaign `run5`. The goal is to identify any potential duplicates by counting the occurrences of each email's message ID for specific event types (e.g., `Send`, `Delivery`).

- **Columns**:
  - `eventtype`: The type of event (e.g., `Send`, `Delivery`).
  - `email_count`: The number of times an email with the same `messageId` appears in the events log.
  - `number_of_emails`: The total count of emails that share the same event type and message ID count, to verify if there are any duplicates (e.g., an email with `email_count` greater than 1 indicates a duplicate).

- **Data Source**: The query processes emails from the `ses_events` table, filtered for the campaign `'run5'`. It groups the data by `messageId` and `eventtype` and then counts how many times each email appears for a given event type.

```sql
SELECT 
    eventtype,
    email_count,
    COUNT(*) AS number_of_emails
FROM (
    SELECT 
        mail.messageId,
        eventtype,
        COUNT(*) AS email_count
    FROM 
        ses_events
    WHERE mail.tags.campaign[1] = 'run5'
    GROUP BY 
        mail.messageId,
        eventtype
) AS counts
GROUP BY 
    email_count,
    eventtype
ORDER BY 
    email_count ASC;
```

---

### Query 3: Average Throughput Across Percentile Ranges

**Purpose**: This query analyzes email delivery events for the campaign `run5` and calculates the average throughput (emails delivered per second) across three percentile ranges. The ranges represent different time intervals from the start of the campaign to the end: 
  - Lower 20% of delivery times
  - Middle 70% of delivery times (from the 20th to 90th percentile)
  - Upper 10% of delivery times.

- **Steps**:
  1. **Identify delivery events**: The first CTE (`delivery_events`) extracts the `Delivery` events along with their timestamps and Unix timestamps for further processing.
  2. **Calculate percentiles**: The second CTE (`event_percentiles`) calculates the minimum, 20th percentile, 90th percentile, and maximum Unix timestamps of the delivery events.
  3. **Count deliveries in each percentile range**: The third CTE (`delivery_counts`) counts how many deliveries occurred within each of the three percentile ranges (0-20%, 20-90%, and 90-100%).
  4. **Calculate average throughput**: The fourth CTE (`percentile_ranges`) defines the duration of time (in seconds) covered by each percentile range. Finally, the main query calculates the average number of deliveries per second in each range.

- **Final Output**:
  - `avg_deliveries_per_second_lower`: The average delivery rate (emails per second) in the lower 20% of delivery times.
  - `avg_deliveries_per_second_middle`: The average delivery rate in the middle 70% of delivery times (between the 20th and 90th percentiles).
  - `avg_deliveries_per_second_upper`: The average delivery rate in the upper 10% of delivery times.

- **Data Source**: The `ses_events` table filtered for email events of type `Delivery` and for the campaign `'run5'`.

```sql
WITH 
    -- Step 1: Define delivery events
    delivery_events AS (
        SELECT
            eventtype,
            CAST(from_iso8601_timestamp(mail.timestamp) AS timestamp) AS delivery_time,
            date_diff('second', TIMESTAMP '1970-01-01 00:00:00', CAST(from_iso8601_timestamp(mail.timestamp) AS timestamp)) AS unix_timestamp
        FROM
            ses_events
        WHERE
            eventtype = 'Delivery' AND mail.tags.campaign[1] = 'run5'
    ),
    
    -- Step 2: Calculate event percentiles
    event_percentiles AS (
        SELECT
            min(unix_timestamp) AS min_timestamp,
            approx_percentile(unix_timestamp, 0.20) AS lower_percentile_unix_timestamp,
            approx_percentile(unix_timestamp, 0.90) AS median_percentile_unix_timestamp,
            max(unix_timestamp) AS max_timestamp
        FROM
            delivery_events
    ),
    
    -- Step 3: Count deliveries within percentile ranges
    delivery_counts AS (
        SELECT
            SUM(CASE WHEN unix_timestamp >= p.min_timestamp AND unix_timestamp < p.lower_percentile_unix_timestamp THEN 1 ELSE 0 END) AS count_lower,
            SUM(CASE WHEN unix_timestamp >= p.lower_percentile_unix_timestamp AND unix_timestamp < p.median_percentile_unix_timestamp THEN 1 ELSE 0 END) AS count_middle,
            SUM(CASE WHEN unix_timestamp >= p.median_percentile_unix_timestamp AND unix_timestamp <= p.max_timestamp THEN 1 ELSE 0 END) AS count_upper
        FROM
            delivery_events e
        CROSS JOIN
            event_percentiles p
    ),
    
    -- Step 4: Calculate average deliveries per second within each percentile range
    percentile_ranges AS (
        SELECT
            min(unix_timestamp) AS min_timestamp,
            approx_percentile(unix_timestamp, 0.20) AS lower_percentile_timestamp,
            approx_percentile(unix_timestamp, 0.90) AS upper_percentile_timestamp,
            max(unix_timestamp) AS max_timestamp
        FROM
            delivery_events
    )
    
-- Final query to calculate averages
SELECT
    delivery_counts.count_lower / (percentile_ranges.lower_percentile_timestamp - percentile_ranges.min_timestamp) AS avg_deliveries_per_second_lower,
    delivery_counts.count_middle / (percentile_ranges.upper_percentile_timestamp - percentile_ranges.lower_percentile_timestamp) AS avg_deliveries_per_second_middle,
    delivery_counts.count_upper / (percentile_ranges.max_timestamp - percentile_ranges.upper_percentile_timestamp) AS avg_deliveries_per_second_upper
FROM
    delivery_counts
CROSS JOIN
    percentile_ranges;
```
